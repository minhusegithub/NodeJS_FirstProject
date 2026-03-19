import { Order, OrderItem, User, Store, ProductStoreInventory, Product } from '../models/sequelize/index.js';
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

// Biến đếm toàn cục chống trùng lặp mã đơn
let orderCounter = 1;

// ============================================================================
// HÀM CHẠY CHÍNH
// ============================================================================

const seedTransactions = async () => {
  try {
    console.log('⏳ Đang phân tích khoảng trống thời gian...');

    // 1. TÌM NGÀY CỦA ĐƠN HÀNG CUỐI CÙNG
    const lastOrder = await Order.findOne({ order: [['created_at', 'DESC']] });

    let daysToGenerate = 0;
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (!lastOrder) {
      daysToGenerate = 180; // Nếu DB trống, tạo 180 ngày
      console.log('👉 Lần chạy đầu tiên: Khởi tạo dữ liệu hữu cơ 180 ngày qua.');
    } else {
      const lastDate = new Date(lastOrder.created_at);
      const lastMidnight = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
      daysToGenerate = Math.floor((todayMidnight - lastMidnight) / (1000 * 60 * 60 * 24));

      if (daysToGenerate > 0) {
        console.log(`👉 Chạy bù dữ liệu: Sinh đơn hàng cho ${daysToGenerate} ngày bị khuyết.`);
      } else {
        console.log(`👉 Hôm nay đã có dữ liệu. Sẽ bơm thêm một vài đơn mới (Realtime Simulation).`);
      }
    }

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
      else if (product.sku.startsWith('DSI-')) product.weight = 5;  // Hàng ế: 5% cơ hội
      else product.weight = 10;
      return product;
    });

    const inventories = await ProductStoreInventory.findAll();
    const inventoryMap = {};
    inventories.forEach(inv => inventoryMap[inv.id] = inv.toJSON());

    let totalOrdersCreated = 0;

    // 3. VÒNG LẶP SINH DỮ LIỆU
    for (let dayOffset = daysToGenerate; dayOffset >= 0; dayOffset--) {
      const simulatedDate = new Date(today);
      simulatedDate.setDate(today.getDate() - dayOffset);
      const isToday = (dayOffset === 0);

      // Số đơn: Nếu là chạy bù thì 5-15 đơn. Nếu click chạy thêm trong "Hôm nay" thì 2-5 đơn.
      let ordersTodayCount = isToday && daysToGenerate === 0 ? getRandomInt(2, 5) : getRandomInt(5, 15);

      const dailyOrdersData = [];
      const dailyOrderItemsBuffer = [];

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

        for (let j = 0; j < numItems; j++) {
          // Bốc sản phẩm theo tỷ lệ %
          const selectedProduct = pickProductWeighted(weightedProducts);

          const invId = Object.keys(inventoryMap).find(id =>
            inventoryMap[id].product_id === selectedProduct.id &&
            inventoryMap[id].store_id === store.id
          );

          // Trừ tồn kho nếu còn hàng
          if (invId && inventoryMap[invId].stock > 0) {
            inventoryMap[invId].stock -= 1;
            const itemPrice = parseFloat(selectedProduct.price);
            orderItems.push({
              product_id: selectedProduct.id,
              title: selectedProduct.title,
              price: itemPrice,
              price_new: itemPrice,
              quantity: 1,
              total_price: itemPrice
            });
            orderTotalPrice += itemPrice;
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