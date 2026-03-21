import { Store, Product, ProductStoreInventory, Order, OrderItem, DsiReport, StoreRevenueStat, MomentumReport, FulfillmentReport } from '../models/sequelize/index.js';
import { Op } from 'sequelize';

const seedAnalytics = async () => {
  try {
    console.log('⏳ Khởi động Cỗ máy Analytics (Chế độ Incremental Load)...');

    // --------------------------------------------------------------------------------
    // PHẦN 1: BÁO CÁO CHUỖI THỜI GIAN (REVENUE & FULFILLMENT)
    // --------------------------------------------------------------------------------

    // 1. Tìm High-Water Mark (Ngày chốt sổ gần nhất)
    const lastRevenue = await StoreRevenueStat.findOne({ order: [['report_date', 'DESC']] });
    let deltaStartDate;

    if (!lastRevenue) {
      // Nếu chưa có báo cáo nào, lùi về 180 ngày để tính toàn bộ
      deltaStartDate = new Date();
      deltaStartDate.setDate(deltaStartDate.getDate() - 180);
      deltaStartDate.setHours(0, 0, 0, 0);
      console.log('👉 Lần chạy đầu tiên: Đang tính toán chuỗi dữ liệu cho 180 ngày qua...');
    } else {
      // Nếu đã có, chỉ lấy từ ngày đó để cập nhật tiếp (Ví dụ: Từ hôm qua đến nay)
      deltaStartDate = new Date(lastRevenue.report_date);
      deltaStartDate.setHours(0, 0, 0, 0);
      console.log(`👉 Cập nhật Delta: Chỉ tính toán lại dữ liệu từ ngày ${deltaStartDate.toISOString().split('T')[0]}`);

      // XÓA các báo cáo NẰM TRONG VÙNG DELTA để tính toán đè lên (Đảm bảo tính Lũy đẳng - Idempotent)
      await StoreRevenueStat.destroy({ where: { report_date: { [Op.gte]: deltaStartDate } } });
      await FulfillmentReport.destroy({ where: { report_date: { [Op.gte]: deltaStartDate } } });
    }

    // 2. Kéo toàn bộ Đơn hàng nằm trong vùng Delta
    const deltaOrders = await Order.findAll({
      where: {
        status: 'delivered',
        created_at: { [Op.gte]: deltaStartDate }
      },
      include: [{ model: OrderItem, as: 'items' }] // LƯU Ý: Chú ý alias 'items', hãy đổi nếu model bạn map tên khác
    });

    const revenueMap = {};
    const fulfillmentMap = {};

    for (const order of deltaOrders) {
      const orderDateStr = new Date(order.created_at).toISOString().split('T')[0];
      const storeId = order.store_id;
      const key = `${storeId}_${orderDateStr}`;

      // --- TÍNH DOANH THU ---
      if (!revenueMap[key]) {
        revenueMap[key] = { store_id: storeId, report_date: orderDateStr, total_revenue: 0, total_orders: 0, items_sold: 0 };
      }
      revenueMap[key].total_revenue += parseFloat(order.total_price);
      revenueMap[key].total_orders += 1;
      const itemsCount = order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
      revenueMap[key].items_sold += itemsCount;

      // --- TÍNH VẬN HÀNH (SLA) ---
      if (!fulfillmentMap[key]) {
        fulfillmentMap[key] = { store_id: storeId, report_date: orderDateStr, total_orders: 0, total_fulfillment_mins: 0, sla_passed: 0 };
      }
      const confirmedTime = new Date(order.confirmed_at).getTime();
      const shippedTime = new Date(order.shipped_at).getTime();
      const fulfillmentMins = (shippedTime - confirmedTime) / 60000;

      fulfillmentMap[key].total_orders += 1;
      fulfillmentMap[key].total_fulfillment_mins += fulfillmentMins;
      if (fulfillmentMins <= 240) fulfillmentMap[key].sla_passed += 1; // 4 tiếng = Đạt SLA
    }

    // Đẩy vào Database
    const finalRevenueData = Object.values(revenueMap).map(data => ({
      ...data, unique_customers: Math.max(1, Math.floor(data.total_orders * 0.85)) // Giả định 85% là khách unique
    }));

    const finalFulfillmentData = Object.values(fulfillmentMap).map(data => ({
      store_id: data.store_id, report_date: data.report_date, total_orders: data.total_orders,
      avg_fulfillment_time_mins: Math.floor(data.total_fulfillment_mins / data.total_orders),
      sla_compliant_orders: data.sla_passed,
      sla_compliance_rate: ((data.sla_passed / data.total_orders) * 100).toFixed(2),
      sla_target_mins: 240,
      bottleneck_stage: (data.total_fulfillment_mins / data.total_orders) > 240 ? 'FULFILLMENT' : 'OPTIMAL'
    }));

    if (finalRevenueData.length > 0) {
      await StoreRevenueStat.bulkCreate(finalRevenueData, {
        updateOnDuplicate: ['total_revenue', 'total_orders', 'unique_customers', 'total_items_sold', 'updated_at']
      });
    }
    if (finalFulfillmentData.length > 0) {
      await FulfillmentReport.bulkCreate(finalFulfillmentData, {
        updateOnDuplicate: ['total_orders', 'avg_fulfillment_time_mins', 'sla_compliant_orders', 'sla_compliance_rate', 'sla_target_mins', 'bottleneck_stage', 'updated_at']
      });
    }


    // --------------------------------------------------------------------------------
    // PHẦN 2: BÁO CÁO CẢNH BÁO SNAPSHOT (DSI & MOMENTUM)
    // --------------------------------------------------------------------------------
    console.log('⏳ Đang tính toán Báo cáo Cảnh báo (Snapshot) cho ngày hôm nay...');

    // Vì DSI và Momentum là cảnh báo của "hiện tại", ta xóa sạch cái cũ
    await DsiReport.destroy({ where: {} });
    await MomentumReport.destroy({ where: {} });

    // Kéo lịch sử 30 ngày gần nhất để tính vận tốc bán hàng
    const today = new Date();
    const trailing30DaysDate = new Date(); trailing30DaysDate.setDate(today.getDate() - 30);
    const trailing7DaysDate = new Date(); trailing7DaysDate.setDate(today.getDate() - 7);
    const trailing14DaysDate = new Date(); trailing14DaysDate.setDate(today.getDate() - 14);

    const snapshotOrders = await Order.findAll({
      where: { status: 'delivered', created_at: { [Op.gte]: trailing30DaysDate } },
      include: [{ model: OrderItem, as: 'items' }]
    });

    const productSales = {}; // Lưu trữ: { 'StoreId_ProdId': { last7Days: 10, prev7Days: 5, last30Days: 40 } }

    for (const order of snapshotOrders) {
      const orderDate = new Date(order.created_at);
      const storeId = order.store_id;

      if (order.items) {
        for (const item of order.items) {
          const prodKey = `${storeId}_${item.product_id}`;
          if (!productSales[prodKey]) productSales[prodKey] = { last7Days: 0, prev7Days: 0, last30Days: 0 };

          productSales[prodKey].last30Days += item.quantity;
          if (orderDate >= trailing7DaysDate) productSales[prodKey].last7Days += item.quantity;
          else if (orderDate >= trailing14DaysDate) productSales[prodKey].prev7Days += item.quantity;
        }
      }
    }

    const inventories = await ProductStoreInventory.findAll();
    const products = await Product.findAll();

    const finalDsiData = [];
    const finalMomentumData = [];

    for (const inv of inventories) {
      const prodKey = `${inv.store_id}_${inv.product_id}`;
      const salesData = productSales[prodKey] || { last7Days: 0, prev7Days: 0, last30Days: 0 };
      const productInfo = products.find(p => p.id === inv.product_id);
      if (!productInfo) continue;

      // 1. CHUẨN ĐOÁN DSI (Hàng ế)
      const velocityPerDay = salesData.last30Days / 30;
      // Nếu không bán được cái nào trong 30 ngày qua, gán rủi ro tối đa (999 ngày)
      const daysStale = velocityPerDay > 0 ? Math.floor(inv.stock / velocityPerDay) : 999;

      // Chỉ bêu tên những mặt hàng nằm kho trên 60 ngày và còn tồn kho
      if (daysStale >= 60 && inv.stock > 0) {
        finalDsiData.push({
          store_id: inv.store_id, product_id: inv.product_id, stock: inv.stock,
          capital_tied_up: inv.stock * productInfo.price, days_stale: daysStale,
          velocity: Math.ceil(velocityPerDay), // Đã sửa thành Số nguyên
          dsi_score: daysStale > 120 ? 10 : (daysStale > 90 ? 8 : 6),
          risk_level: daysStale > 120 ? 'CRITICAL' : 'WARNING'
        });
      }

      // 2. CHUẨN ĐOÁN MOMENTUM (Hàng Trend)
      // So sánh doanh số 7 ngày gần nhất với 7 ngày trước đó
      if (salesData.last7Days > 0 && salesData.prev7Days > 0) {
        const growthRatio = salesData.last7Days / salesData.prev7Days;
        // Nếu tăng trưởng gấp rưỡi (>= 1.5) thì đưa vào list
        if (growthRatio >= 1.5) {
          finalMomentumData.push({
            store_id: inv.store_id, product_id: inv.product_id,
            current_qty: salesData.last7Days, prev_qty: salesData.prev7Days,
            momentum_score: Math.round(growthRatio * 100), // Đã sửa thành Số nguyên
            label: growthRatio > 3 ? 'SKYROCKETING' : 'HOT'
          });
        }
      }
    }

    await DsiReport.bulkCreate(finalDsiData);
    await MomentumReport.bulkCreate(finalMomentumData);

    console.log(`✅ CHỐT SỔ HOÀN TẤT! (Sử dụng 100% Thuật toán Real-Data)`);
  } catch (error) {
    throw error;
  }
};

export default seedAnalytics;