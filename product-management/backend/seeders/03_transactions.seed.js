import { Order, OrderItem, User, Store, ProductStoreInventory, Product, DsiReport, StoreRevenueStat, MomentumReport, FulfillmentReport, sequelize } from '../models/sequelize/index.js';
import { Op } from 'sequelize';

// ============================================================================
// CÁC HÀM THỐNG KÊ (STATISTICAL HELPERS)
// ============================================================================

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// 1. Phân bổ giờ cao điểm (Peak Hours: Trưa và Tối)
const getOrganicHour = (isToday = false) => {
  // Mảng có tỷ lệ lặp lại để tăng xác suất rơi vào giờ cao điểm
  const hours = [8, 9, 10, 11, 11, 11, 12, 12, 12, 13, 13, 14, 15, 16, 17, 18, 19, 19, 19, 20, 20, 20, 21, 21, 22];
  let selectedHour = hours[Math.floor(Math.random() * hours.length)];

  // Nếu tạo đơn cho "Hôm nay", không được tạo giờ ở tương lai
  if (isToday) {
    const currentHour = new Date().getHours();
    if (selectedHour > currentHour) selectedHour = currentHour;
  }
  return selectedHour;
};

// 2. Phân phối chuẩn thời gian đóng gói (SLA Normal Distribution)
const getFulfillmentTimeMins = () => {
  const probability = Math.random() * 100;
  if (probability <= 80) return getRandomInt(60, 120);    // 80% đơn làm chuẩn: 1 - 2 tiếng
  if (probability <= 95) return getRandomInt(180, 360);   // 15% đơn hơi trễ: 3 - 6 tiếng
  return getRandomInt(720, 1440);                         // 5% đơn ngoại lệ (xui): 12 - 24 tiếng
};

// 3. Chọn sản phẩm theo Trọng số (Weighted Random)
const pickProductWeighted = (weightedProducts) => {
  const totalWeight = weightedProducts.reduce((sum, p) => sum + p.weight, 0);
  let randomVal = Math.random() * totalWeight;
  for (const p of weightedProducts) {
    randomVal -= p.weight;
    if (randomVal <= 0) return p;
  }
  return weightedProducts[0];
};

// 4. Số lượng mua thực tế theo phân khúc giá
const getRealisticQuantity = (price) => {
  if (price < 200000)   return getRandomInt(1, 5);  // Hàng rẻ: mua 1–5 cái
  if (price < 1000000)  return getRandomInt(1, 3);  // Hàng trung: 1–3 cái
  return 1;                                          // Hàng cao cấp: luôn 1
};

// 5. Số đơn hàng theo ngày (cuối tuần ít hơn 40%)
const getOrdersCount = (date, isRealtimeRun) => {
  if (isRealtimeRun) return getRandomInt(2, 5); // Bơm thêm realtime

  const dayOfWeek = date.getDay(); // 0=CN, 6=T7
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const baseCount = isWeekend ? getRandomInt(3, 9) : getRandomInt(5, 15);
  return baseCount;
};

// Biến đếm toàn cục chống trùng lặp mã đơn
let orderCounter = 1;

// ============================================================================
// HÀM CHẠY CHÍNH
// ============================================================================

const seedTransactions = async () => {
  try {
    // 🧹 TỰ ĐỘNG DỌN DẸP VÀ RESET KHO HÀNG + ĐƠN HÀNG CŨ ĐỂ ĐẢM BẢO TÍNH ĐỒNG NHẤT KHI DEMO
    console.log('🧹 Đang dọn dẹp các đơn hàng và báo cáo cũ để reset dữ liệu...');
    await OrderItem.destroy({ where: {}, force: true });
    await Order.destroy({ where: {}, force: true });
    await DsiReport.destroy({ where: {} });
    await StoreRevenueStat.destroy({ where: {} });
    await MomentumReport.destroy({ where: {} });
    await FulfillmentReport.destroy({ where: {} });

    console.log('📦 Đang thiết lập lại lượng tồn kho ban đầu của các cửa hàng...');
    const products = await Product.findAll();
    const inventories = await ProductStoreInventory.findAll();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const inventoryUpdates = [];
    for (const inv of inventories) {
      const product = products.find(p => p.id === inv.product_id);
      if (!product) continue;

      let initialStock = 0;
      let restockDate = new Date();

      if (product.sku.startsWith("DSI-")) {
        initialStock = getRandomInt(30, 50); // Hàng giá trị cao (tủ lạnh, dàn âm thanh...): 30 - 50 cái
        restockDate = sixMonthsAgo;
      } else if (product.sku.startsWith("MOM-")) {
        initialStock = getRandomInt(100, 200); // Hàng xu hướng tầm trung: 100 - 200 cái
        restockDate = twoWeeksAgo;
      } else if (product.sku.startsWith("COW-")) {
        initialStock = getRandomInt(300, 600); // Hàng tiêu dùng nhanh giá rẻ: 300 - 600 cái
        restockDate = twoWeeksAgo;
      } else {
        initialStock = getRandomInt(30, 50);
        restockDate = twoWeeksAgo;
      }

      inventoryUpdates.push({
        id: inv.id,
        store_id: inv.store_id,
        product_id: inv.product_id,
        stock: initialStock,
        last_restock_date: restockDate,
        reserved_stock: 0
      });
    }
    await ProductStoreInventory.bulkCreate(inventoryUpdates, { updateOnDuplicate: ['stock', 'last_restock_date', 'reserved_stock'] });
    console.log('✅ Đã khôi phục tồn kho ban đầu!');

    let daysToGenerate = 180; // Luôn sinh 180 ngày khi reset
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    console.log('👉 Tiến hành sinh mới 180 ngày dữ liệu hữu cơ.');

    // 2. CHUẨN BỊ DỮ LIỆU GỐC TRÊN RAM
    const allUsers = await User.findAll();
    const customers = allUsers.filter(user => user.email && user.email.startsWith('khachhang'));
    const stores = await Store.findAll();

    // Gán trọng số cho từng sản phẩm
    const rawProducts = await Product.findAll();
    const weightedProducts = rawProducts.map(p => {
      const product = p.toJSON();
      if (product.sku.startsWith('COW-')) product.weight = 75;      // Bò vắt sữa: 75% cơ hội
      else if (product.sku.startsWith('MOM-')) product.weight = 20; // Hàng trend: 20% cơ hội
      else if (product.sku.startsWith('DSI-')) product.weight = 1;  // Hàng ế: 1% cơ hội (bán rất chậm)
      else product.weight = 10;
      return product;
    });

    // Tạo Map O(1) thay vì tìm kiếm O(n) mỗi lần bốc sản phẩm
    const freshInventories = await ProductStoreInventory.findAll();
    const inventoryMap = {};
    const invLookup = new Map(); // "storeId_productId" → inventoryId
    freshInventories.forEach(inv => {
      inventoryMap[inv.id] = inv.toJSON();
      invLookup.set(`${inv.store_id}_${inv.product_id}`, inv.id);
    });

    let totalOrdersCreated = 0;

    // 3. VÒNG LẶP SINH DỮ LIỆU
    for (let dayOffset = daysToGenerate; dayOffset >= 0; dayOffset--) {
      const simulatedDate = new Date(today);
      simulatedDate.setDate(today.getDate() - dayOffset);
      const isToday = (dayOffset === 0);
      const isRealtimeRun = isToday && daysToGenerate === 0;

      const ordersTodayCount = getOrdersCount(simulatedDate, isRealtimeRun);

      const dailyOrdersData = [];
      const dailyOrderItemsBuffer = [];

      // Cấu hình trọng số động: Đóng băng không cho bán hàng DSI trong 45 ngày qua để tạo hàng ế
      const currentWeightedProducts = weightedProducts.map(p => {
        if (p.sku.startsWith('DSI-') && dayOffset <= 45) {
          return { ...p, weight: 0 };
        }
        return p;
      });

      for (let i = 0; i < ordersTodayCount; i++) {
        const store = stores[getRandomInt(0, stores.length - 1)];
        const customer = customers[getRandomInt(0, customers.length - 1)];

        // Tạo mốc thời gian hữu cơ
        const orderCreatedAt = new Date(simulatedDate);
        orderCreatedAt.setHours(getOrganicHour(isToday), getRandomInt(0, 59), 0);

        const confirmedAt = new Date(orderCreatedAt.getTime() + getRandomInt(15, 60) * 60000);
        const fulfillmentMins = getFulfillmentTimeMins(); // Thuật toán phân phối chuẩn
        const shippedAt = new Date(confirmedAt.getTime() + fulfillmentMins * 60000);
        const deliveredAt = new Date(shippedAt.getTime() + getRandomInt(24, 72) * 3600000);

        const orderItems = [];
        let orderTotalPrice = 0;
        const numItems = getRandomInt(1, 3); // Mỗi đơn mua 1-3 mặt hàng

        // Dùng Set để tránh trùng sản phẩm trong cùng 1 đơn hàng
        const pickedProductIds = new Set();

        for (let j = 0; j < numItems; j++) {
          // Bốc sản phẩm theo tỷ lệ %, tránh trùng
          let selectedProduct;
          let attempts = 0;
          do {
            selectedProduct = pickProductWeighted(currentWeightedProducts);
            attempts++;
          } while (pickedProductIds.has(selectedProduct.id) && attempts < 10);

          if (pickedProductIds.has(selectedProduct.id)) continue;
          pickedProductIds.add(selectedProduct.id);

          // Tra cứu tồn kho O(1)
          const invId = invLookup.get(`${store.id}_${selectedProduct.id}`);

          // Tính số lượng mua theo giá sản phẩm
          const itemPrice = parseFloat(selectedProduct.price);
          const quantity = getRealisticQuantity(itemPrice);

          // Trừ tồn kho nếu còn đủ hàng
          if (invId && inventoryMap[invId].stock >= quantity) {
            inventoryMap[invId].stock -= quantity;
            orderItems.push({
              product_id: selectedProduct.id,
              title: selectedProduct.title,
              price: itemPrice,
              price_new: itemPrice,
              quantity: quantity,
              total_price: itemPrice * quantity
            });
            orderTotalPrice += itemPrice * quantity;
          }
        }

        if (orderItems.length > 0) {
          const dateStr = simulatedDate.toISOString().slice(2, 10).replace(/-/g, '');
          const uniqueOrderCode = `ORD-${dateStr}-${Date.now().toString().slice(-4)}-${orderCounter++}`;

          dailyOrdersData.push({
            code: uniqueOrderCode, user_id: customer.id, store_id: store.id,
            user_info: { fullName: customer.full_name, phone: customer.phone, address: customer.address },
            total_price: orderTotalPrice, payment_method: 'COD', payment_status: 'paid', status: 'delivered',
            created_at: orderCreatedAt, confirmed_at: confirmedAt, shipped_at: shippedAt, delivered_at: deliveredAt
          });
          dailyOrderItemsBuffer.push(orderItems);
        }
      }

      // Ghi vào DB
      if (dailyOrdersData.length > 0) {
        const insertedOrders = await Order.bulkCreate(dailyOrdersData, { hooks: false, returning: true });
        totalOrdersCreated += insertedOrders.length;

        const finalItemsToInsert = [];
        for (let idx = 0; idx < insertedOrders.length; idx++) {
          dailyOrderItemsBuffer[idx].forEach(item => {
            item.order_id = insertedOrders[idx].id;
            finalItemsToInsert.push(item);
          });
        }
        await OrderItem.bulkCreate(finalItemsToInsert, { hooks: false });
      }
    }

    // 4. CHỐT LẠI TỒN KHO DB
    const bulkInventoryUpdates = [];
    for (const [id, invData] of Object.entries(inventoryMap)) {
      bulkInventoryUpdates.push({
        id: parseInt(id),
        product_id: invData.product_id,
        store_id: invData.store_id,
        stock: invData.stock
      });
    }
    await ProductStoreInventory.bulkCreate(bulkInventoryUpdates, { updateOnDuplicate: ['stock'] });

    console.log(`✅ CHỐT: Đã sinh thành công ${totalOrdersCreated} đơn hàng bằng thuật toán Organic!`);
  } catch (error) {
    throw error;
  }
};

export default seedTransactions;