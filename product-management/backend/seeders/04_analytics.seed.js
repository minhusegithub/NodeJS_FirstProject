import {
  Store,
  Product,
  ProductStoreInventory,
  DsiReport,
  StoreRevenueStat,
  MomentumReport,
  FulfillmentReport,
} from "../models/sequelize/index.js";

const seedAnalytics = async () => {
  try {
    const stores = await Store.findAll();
    const products = await Product.findAll();
    const inventories = await ProductStoreInventory.findAll();

    const dsiData = [];
    const momentumData = [];
    const fulfillmentData = [];
    const revenueData = [];

    const today = new Date();

    for (const store of stores) {
      // 1. Tạo Store Revenue & Fulfillment (Giả lập chốt sổ ngày hôm nay)
      revenueData.push({
        store_id: store.id,
        report_date: today,
        total_revenue: Math.floor(Math.random() * 50000000) + 10000000,
        total_orders: Math.floor(Math.random() * 50) + 10,
        unique_customers: 15,
        total_items_sold: 45,
      });

      // HN02 bị đánh giá Tệ (Bottleneck ở khâu Fulfillment)
      fulfillmentData.push({
        store_id: store.id,
        report_date: today,
        total_orders: 40,
        avg_lead_time_mins: store.code === "HN02" ? 120 : 30,
        avg_fulfillment_time_mins: store.code === "HN02" ? 720 : 120, // 12 tiếng vs 2 tiếng
        avg_delivery_time_mins: 2880,
        sla_target_mins: 240,
        sla_compliant_orders: store.code === "HN02" ? 5 : 35,
        sla_compliance_rate: store.code === "HN02" ? 12.5 : 87.5,
        bottleneck_stage: store.code === "HN02" ? "FULFILLMENT" : "OPTIMAL",
      });

      // 2. Tạo DSI & Momentum cho từng sản phẩm
      for (const product of products) {
        const inv = inventories.find(
          (i) => i.store_id === store.id && i.product_id === product.id,
        );
        if (!inv) continue;

        if (product.sku.startsWith("DSI-")) {
          dsiData.push({
            store_id: store.id,
            product_id: product.id,
            stock: inv.stock,
            capital_tied_up: inv.stock * product.price,
            days_stale: 65,
            velocity: 0,
            dsi_score: (65 * (inv.stock * product.price)) / 1,
            risk_level: "CRITICAL",
          });
        } else if (product.sku.startsWith("MOM-")) {
          momentumData.push({
            store_id: store.id,
            product_id: product.id,
            current_qty: 150,
            prev_qty: 30,
            momentum_score: 5.0,
            label: "SKYROCKETING",
          });
        }
      }
    }

    await StoreRevenueStat.bulkCreate(revenueData, { ignoreDuplicates: true });
    await FulfillmentReport.bulkCreate(fulfillmentData, {
      ignoreDuplicates: true,
    });
    await DsiReport.bulkCreate(dsiData, { ignoreDuplicates: true });
    await MomentumReport.bulkCreate(momentumData, { ignoreDuplicates: true });

    console.log("✅ Chốt sổ Analytics thành công! Dashboard đã có dữ liệu.");
  } catch (error) {
    throw error;
  }
};

export default seedAnalytics;
