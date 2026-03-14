import {
  Order,
  OrderItem,
  User,
  Store,
  ProductStoreInventory,
  Product,
} from "../models/sequelize/index.js"; // Nhớ check đường dẫn

const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
let orderCounter = 1; // KHẮC PHỤC LỖI UNIQUE CODE

const seedTransactions = async () => {
  try {
    // Fix: Lọc khách hàng dựa trên Email thay vì role_id
    const allUsers = await User.findAll();
    const customers = allUsers.filter((user) =>
      user.email.startsWith("khachhang"),
    );
    if (!customers.length) throw new Error("Không tìm thấy Khách hàng.");

    const stores = await Store.findAll();
    const products = await Product.findAll();
    const productGroups = {
      dsi: products.filter((p) => p.sku.startsWith("DSI-")),
      mom: products.filter((p) => p.sku.startsWith("MOM-")),
      cow: products.filter((p) => p.sku.startsWith("COW-")),
    };

    const inventories = await ProductStoreInventory.findAll();
    const inventoryMap = {};
    inventories.forEach((inv) => (inventoryMap[inv.id] = inv.toJSON()));

    let totalOrdersCreated = 0;

    for (let dayOffset = 180; dayOffset >= 0; dayOffset--) {
      const simulatedDate = new Date();
      simulatedDate.setDate(simulatedDate.getDate() - dayOffset);

      let ordersTodayCount =
        dayOffset <= 14 ? getRandomInt(15, 30) : getRandomInt(5, 10);
      const dailyOrdersData = [];
      const dailyOrderItemsBuffer = [];

      for (let i = 0; i < ordersTodayCount; i++) {
        const store = stores[getRandomInt(0, stores.length - 1)];
        const customer = customers[getRandomInt(0, customers.length - 1)];

        const orderCreatedAt = new Date(simulatedDate);
        orderCreatedAt.setHours(getRandomInt(8, 20), getRandomInt(0, 59), 0);

        let confirmedAt, shippedAt, deliveredAt;
        if (store.code === "HN02") {
          confirmedAt = new Date(
            orderCreatedAt.getTime() + getRandomInt(60, 180) * 60000,
          );
          shippedAt = new Date(
            confirmedAt.getTime() + getRandomInt(6, 24) * 3600000,
          );
        } else {
          confirmedAt = new Date(
            orderCreatedAt.getTime() + getRandomInt(15, 60) * 60000,
          );
          shippedAt = new Date(
            confirmedAt.getTime() + getRandomInt(1, 3) * 3600000,
          );
        }
        deliveredAt = new Date(
          shippedAt.getTime() + getRandomInt(24, 72) * 3600000,
        );

        const orderItems = [];
        let orderTotalPrice = 0;
        const numItems = getRandomInt(1, 2);

        for (let j = 0; j < numItems; j++) {
          let eligibleProducts = [...productGroups.cow];
          if (dayOffset > 60)
            eligibleProducts = eligibleProducts.concat(productGroups.dsi);
          if (dayOffset <= 14)
            eligibleProducts = eligibleProducts.concat(productGroups.mom);

          const selectedProduct =
            eligibleProducts[getRandomInt(0, eligibleProducts.length - 1)];
          const invId = Object.keys(inventoryMap).find(
            (id) =>
              inventoryMap[id].product_id === selectedProduct.id &&
              inventoryMap[id].store_id === store.id,
          );

          if (invId && inventoryMap[invId].stock > 0) {
            inventoryMap[invId].stock -= 1;
            const itemPrice = parseFloat(selectedProduct.price);
            orderItems.push({
              product_id: selectedProduct.id,
              title: selectedProduct.title,
              price: itemPrice,
              price_new: itemPrice,
              quantity: 1,
              total_price: itemPrice,
            });
            orderTotalPrice += itemPrice;
          }
        }

        if (orderItems.length > 0) {
          // MÃ ĐƠN HÀNG UNIQUE TUYỆT ĐỐI
          const dateStr = simulatedDate
            .toISOString()
            .slice(2, 10)
            .replace(/-/g, "");
          const uniqueOrderCode = `ORD-${dateStr}-${getRandomInt(100, 999)}-${orderCounter++}`;

          dailyOrdersData.push({
            code: uniqueOrderCode,
            user_id: customer.id,
            store_id: store.id,
            user_info: {
              fullName: customer.full_name,
              phone: customer.phone,
              address: customer.address,
            },
            total_price: orderTotalPrice,
            payment_method: "COD",
            payment_status: "paid",
            status: "delivered",
            created_at: orderCreatedAt,
            confirmed_at: confirmedAt,
            shipped_at: shippedAt,
            delivered_at: deliveredAt,
          });
          dailyOrderItemsBuffer.push(orderItems);
        }
      }

      if (dailyOrdersData.length > 0) {
        const insertedOrders = await Order.bulkCreate(dailyOrdersData, {
          hooks: false,
          returning: true,
        });
        totalOrdersCreated += insertedOrders.length;

        const finalItemsToInsert = [];
        for (let idx = 0; idx < insertedOrders.length; idx++) {
          dailyOrderItemsBuffer[idx].forEach((item) => {
            item.order_id = insertedOrders[idx].id;
            finalItemsToInsert.push(item);
          });
        }
        await OrderItem.bulkCreate(finalItemsToInsert, { hooks: false });
      }
    }

    const bulkInventoryUpdates = [];
    for (const [id, invData] of Object.entries(inventoryMap)) {
      bulkInventoryUpdates.push({
        id: parseInt(id),
        product_id: invData.product_id, // <-- Cấp thêm ID sản phẩm cho PostgreSQL
        store_id: invData.store_id, // <-- Cấp thêm ID cửa hàng cho PostgreSQL
        stock: invData.stock,
      });
    }
    await ProductStoreInventory.bulkCreate(bulkInventoryUpdates, {
      updateOnDuplicate: ["stock"],
    });

    console.log(
      `✅ Seed Giao dịch thành công! Tối ưu hóa mượt mà: ${totalOrdersCreated} đơn hàng.`,
    );
  } catch (error) {
    throw error;
  }
};

export default seedTransactions;
