import {
  ProductCategory,
  Product,
  Store,
  ProductStoreInventory,
} from "../models/sequelize/index.js"; // Nhớ check đường dẫn

const seedInventory = async () => {
  try {
    console.log("⏳ Đang tạo Danh mục sản phẩm (Categories) mở rộng...");

    // 1. TẠO DANH MỤC CHA
    const catElec = await ProductCategory.create({
      title: "Điện tử & Công nghệ",
      slug: "dien-tu-cong-nghe",
    });
    const catApp = await ProductCategory.create({
      title: "Đồ gia dụng",
      slug: "do-gia-dung",
    });
    const catFashion = await ProductCategory.create({
      title: "Thời trang & Phụ kiện",
      slug: "thoi-trang-phu-kien",
    });
    const catBeauty = await ProductCategory.create({
      title: "Sức khỏe & Làm đẹp",
      slug: "suc-khoe-lam-dep",
    });

    // 2. TẠO DANH MỤC CON
    const catPhone = await ProductCategory.create({
      title: "Điện thoại & Phụ kiện",
      slug: "dien-thoai-phu-kien",
      parent_id: catElec.id,
    });
    const catAudio = await ProductCategory.create({
      title: "Thiết bị Âm thanh",
      slug: "thiet-bi-am-thanh",
      parent_id: catElec.id,
    });
    const catKitchen = await ProductCategory.create({
      title: "Thiết bị Nhà bếp",
      slug: "thiet-bi-nha-bep",
      parent_id: catApp.id,
    });
    const catHome = await ProductCategory.create({
      title: "Vệ sinh & Chăm sóc nhà",
      slug: "ve-sinh-cham-soc-nha",
      parent_id: catApp.id,
    });
    const catClothing = await ProductCategory.create({
      title: "Quần áo Nam/Nữ",
      slug: "quan-ao-nam-nu",
      parent_id: catFashion.id,
    });
    const catSkincare = await ProductCategory.create({
      title: "Chăm sóc da mặt",
      slug: "cham-soc-da-mat",
      parent_id: catBeauty.id,
    });

    console.log("⏳ Đang tạo Kho Sản phẩm (20+ Items) theo 3 kịch bản...");

    // 3. TẠO SẢN PHẨM (Quy mô lớn hơn)
    const productsData = [
      // 🔴 NHÓM 1: HÀNG Ế (DSI) - Tồn kho lâu, giá trị cao, kén khách
      {
        title: "Tủ lạnh Inverter cao cấp 600L",
        slug: "tu-lanh-inverter-cao-cap-600l",
        price: 25000000,
        stock: 0,
        product_category_id: catKitchen.id,
        sku: "DSI-001",
        brand: "Samsung",
      },
      {
        title: "Dàn âm thanh Hi-Fi rạp hát tại gia",
        slug: "dan-am-thanh-hi-fi",
        price: 18000000,
        stock: 0,
        product_category_id: catAudio.id,
        sku: "DSI-002",
        brand: "Sony",
      },
      {
        title: "Máy chạy bộ đa năng Pro Max",
        slug: "may-chay-bo-da-nang",
        price: 12500000,
        stock: 0,
        product_category_id: catHome.id,
        sku: "DSI-003",
        brand: "Kingsport",
      },
      {
        title: "Áo khoác dạ lông cừu mùa đông",
        slug: "ao-khoac-da-long-cuu",
        price: 2500000,
        stock: 0,
        product_category_id: catClothing.id,
        sku: "DSI-004",
        brand: "Zara",
      }, // Bán áo mùa đông vào mùa hè -> Ế
      {
        title: "Máy pha cà phê Espresso chuyên nghiệp",
        slug: "may-pha-ca-phe-espresso",
        price: 8900000,
        stock: 0,
        product_category_id: catKitchen.id,
        sku: "DSI-005",
        brand: "Delonghi",
      },

      // 🚀 NHÓM 2: HÀNG TREND (MOMENTUM) - Đang viral, bán cực chạy
      {
        title: "Tai nghe Bluetooth chống ồn X1",
        slug: "tai-nghe-bluetooth-x1",
        price: 450000,
        stock: 0,
        product_category_id: catAudio.id,
        sku: "MOM-001",
        brand: "Xiaomi",
        featured: true,
      },
      {
        title: "Nồi chiên không dầu điện tử 5L",
        slug: "noi-chien-khong-dau-5l",
        price: 850000,
        stock: 0,
        product_category_id: catKitchen.id,
        sku: "MOM-002",
        brand: "Philips",
        featured: true,
      },
      {
        title: "Son kem lì màu Đỏ Gạch Hot Trend",
        slug: "son-kem-li-do-gach",
        price: 250000,
        stock: 0,
        product_category_id: catSkincare.id,
        sku: "MOM-003",
        brand: "3CE",
        featured: true,
      },
      {
        title: "Bình giữ nhiệt Gấu Dâu 1000ml",
        slug: "binh-giu-nhiet-gau-dau",
        price: 150000,
        stock: 0,
        product_category_id: catHome.id,
        sku: "MOM-004",
        brand: "OEM",
        featured: true,
      },
      {
        title: "Quạt tích điện mini gấp gọn",
        slug: "quat-tich-dien-mini",
        price: 180000,
        stock: 0,
        product_category_id: catElec.id,
        sku: "MOM-005",
        brand: "Baseus",
        featured: true,
      },

      // 🟢 NHÓM 3: BÒ VẮT SỮA (COW) - Hàng thiết yếu, bán đều đặn hàng ngày
      {
        title: "Cáp sạc nhanh Type-C 20W",
        slug: "cap-sac-nhanh-type-c",
        price: 120000,
        stock: 0,
        product_category_id: catPhone.id,
        sku: "COW-001",
        brand: "Anker",
      },
      {
        title: "Ốp lưng silicon chống sốc trong suốt",
        slug: "op-lung-silicon",
        price: 80000,
        stock: 0,
        product_category_id: catPhone.id,
        sku: "COW-002",
        brand: "Nillkin",
      },
      {
        title: "Sạc dự phòng 10000mAh",
        slug: "sac-du-phong-10000mah",
        price: 250000,
        stock: 0,
        product_category_id: catPhone.id,
        sku: "COW-003",
        brand: "Baseus",
      },
      {
        title: "Sữa rửa mặt trị mụn dịu nhẹ 150ml",
        slug: "sua-rua-mat-tri-mun",
        price: 320000,
        stock: 0,
        product_category_id: catSkincare.id,
        sku: "COW-004",
        brand: "Cerave",
      },
      {
        title: "Nước tẩy trang không cồn 400ml",
        slug: "nuoc-tay-trang-khong-con",
        price: 180000,
        stock: 0,
        product_category_id: catSkincare.id,
        sku: "COW-005",
        brand: "Loreal",
      },
      {
        title: "Áo thun Cotton Basic Cổ Tròn",
        slug: "ao-thun-cotton-basic",
        price: 150000,
        stock: 0,
        product_category_id: catClothing.id,
        sku: "COW-006",
        brand: "Uniqlo",
      },
      {
        title: "Set 5 đôi tất cổ ngắn kháng khuẩn",
        slug: "set-5-doi-tat-co-ngan",
        price: 99000,
        stock: 0,
        product_category_id: catClothing.id,
        sku: "COW-007",
        brand: "OEM",
      },
      {
        title: "Thùng 10 gói khăn giấy ướt an toàn",
        slug: "thung-10-goi-khan-giay-uot",
        price: 120000,
        stock: 0,
        product_category_id: catHome.id,
        sku: "COW-008",
        brand: "Mamamy",
      },
      {
        title: "Nước giặt xả 2 trong 1 can 3.8kg",
        slug: "nuoc-giat-xa-can-3-8kg",
        price: 195000,
        stock: 0,
        product_category_id: catHome.id,
        sku: "COW-009",
        brand: "Omo",
      },
      {
        title: "Set 10 Móc nhôm phơi quần áo cao cấp",
        slug: "set-10-moc-nhom-phoi-do",
        price: 65000,
        stock: 0,
        product_category_id: catHome.id,
        sku: "COW-010",
        brand: "OEM",
      },
    ];

    await Product.bulkCreate(productsData);
    const createdProducts = await Product.findAll();

    console.log(
      "⏳ Đang phân bổ Tồn kho (Inventory) cực lớn cho các Chi nhánh...",
    );

    // 4. CHIA TỒN KHO VỀ TỪNG CỬA HÀNG
    const stores = await Store.findAll();
    const inventoryData = [];

    // Giả lập mốc thời gian nhập hàng
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    for (const store of stores) {
      for (const product of createdProducts) {
        let initialStock = 0;
        let restockDate = new Date();

        // Phân bổ logic tồn kho mạnh tay hơn
        if (product.sku.startsWith("DSI-")) {
          // Cố tình tạo ra lượng tồn kho chết (Dead Stock) khổng lồ để chỉ số DSI vọt lên cao
          initialStock = Math.floor(Math.random() * 20) + 30; // 30 - 50 cái
          restockDate = sixMonthsAgo;
        } else if (product.sku.startsWith("MOM-")) {
          // Hàng trend nhập số lượng nhiều để lát xả hàng
          initialStock = Math.floor(Math.random() * 300) + 200; // 200 - 500 cái
          restockDate = twoWeeksAgo;
        } else if (product.sku.startsWith("COW-")) {
          // Hàng bán đều ngày nào cũng nhập ngập kho
          initialStock = Math.floor(Math.random() * 1000) + 1000; // 1000 - 2000 cái
          restockDate = twoWeeksAgo;
        }

        inventoryData.push({
          store_id: store.id,
          product_id: product.id,
          stock: initialStock,
          status: "active",
          reserved_stock: 0,
          last_restock_date: restockDate,
          location: `Kệ ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}-${Math.floor(Math.random() * 10) + 1}`,
        });
      }
    }

    await ProductStoreInventory.bulkCreate(inventoryData);

    console.log(
      `✅ Seed Inventory thành công! Đã tạo ${productsData.length} sản phẩm và phủ đầy kho của ${stores.length} chi nhánh.`,
    );
  } catch (error) {
    console.error("❌ Lỗi tại seedInventory:", error);
    throw error;
  }
};

export default seedInventory;
