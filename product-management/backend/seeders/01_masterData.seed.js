import { Role, Store, User, StoreStaff } from "../models/sequelize/index.js"; // Nhớ check lại đường dẫn nếu cần
import crypto from "crypto";

const seedMasterData = async () => {
  try {
    // ----------------------------------------------------------------------
    // 1. TẠO ROLES
    // ----------------------------------------------------------------------
    console.log("⏳ Đang tạo Roles...");
    const rolesData = [
      { name: "SystemAdmin", scope: "system", permissions: ["all"] },
      {
        name: "storeManager",
        scope: "store",
        permissions: ["manage_store", "view_reports"],
      },
      { name: "OrderStaff", scope: "store", permissions: ["manage_orders"] },
      {
        name: "InventoryStaff",
        scope: "store",
        permissions: ["manage_inventory"],
      },
    ];
    await Role.bulkCreate(rolesData, {
      returning: true,
      ignoreDuplicates: true,
    });

    // Map lại ID để gán quyền cho chuẩn xác
    const dbRoles = await Role.findAll();
    const roleMap = {
      SystemAdmin: dbRoles.find((r) => r.name === "SystemAdmin").id,
      storeManager: dbRoles.find((r) => r.name === "storeManager").id,
      OrderStaff: dbRoles.find((r) => r.name === "OrderStaff").id,
      InventoryStaff: dbRoles.find((r) => r.name === "InventoryStaff").id,
    };

    // ----------------------------------------------------------------------
    // 2. TẠO CỬA HÀNG (STORES)
    // ----------------------------------------------------------------------
    console.log("⏳ Đang tạo Cửa hàng...");
    const storesData = [
      {
        code: "HN01",
        name: "Chi nhánh Cầu Giấy",
        address: {
          street: "123 Xuân Thủy",
          district: "Cầu Giấy",
          city: "Hà Nội",
        },
        latitude: 21.0378,
        longitude: 105.7815,
      },
      {
        code: "HN02",
        name: "Chi nhánh Đống Đa",
        address: { street: "456 Thái Hà", district: "Đống Đa", city: "Hà Nội" },
        latitude: 21.0125,
        longitude: 105.8202,
      },
      {
        code: "HCM01",
        name: "Chi nhánh Quận 1",
        address: {
          street: "789 Nguyễn Huệ",
          district: "Quận 1",
          city: "Hồ Chí Minh",
        },
        latitude: 10.7769,
        longitude: 106.7009,
      },
    ];
    await Store.bulkCreate(storesData, { ignoreDuplicates: true });
    const dbStores = await Store.findAll();

    // ----------------------------------------------------------------------
    // 3. TẠO USERS (Admin & Khách hàng)
    // ----------------------------------------------------------------------
    console.log("⏳ Đang tạo Người dùng & Cấp quyền...");

    // Dùng MD5 mã hóa password theo chuẩn hệ thống của bạn
    const defaultHashedPassword = crypto
      .createHash("md5")
      .update("password123")
      .digest("hex");

    // 3.1. Tạo System Admin
    const admin = await User.create({
      full_name: "Super Admin",
      email: "admin@chuoi.com",
      password: defaultHashedPassword,
      phone: "0999999999",
    });
    await StoreStaff.create({
      user_id: admin.id,
      store_id: null,
      role_id: roleMap.SystemAdmin,
    });

    // 3.2. Tạo Nhân sự cho từng Cửa hàng
    for (const store of dbStores) {
      const storeCode = store.code.toLowerCase();

      const manager = await User.create({
        full_name: `Quản lý ${store.name}`,
        email: `manager.${storeCode}@chuoi.com`,
        password: defaultHashedPassword,
      });
      await StoreStaff.create({
        user_id: manager.id,
        store_id: store.id,
        role_id: roleMap.storeManager,
      });
      await store.update({ manager_id: manager.id });

      for (let i = 1; i <= 2; i++) {
        const orderStaff = await User.create({
          full_name: `Sale ${i} ${storeCode.toUpperCase()}`,
          email: `sale${i}.${storeCode}@chuoi.com`,
          password: defaultHashedPassword,
        });
        await StoreStaff.create({
          user_id: orderStaff.id,
          store_id: store.id,
          role_id: roleMap.OrderStaff,
        });
      }

      const invStaff = await User.create({
        full_name: `Thủ kho ${storeCode.toUpperCase()}`,
        email: `kho.${storeCode}@chuoi.com`,
        password: defaultHashedPassword,
      });
      await StoreStaff.create({
        user_id: invStaff.id,
        store_id: store.id,
        role_id: roleMap.InventoryStaff,
      });
    }

    // 3.3. Tạo ngẫu nhiên 50 Khách hàng
    const customers = [];
    for (let i = 1; i <= 50; i++) {
      customers.push({
        full_name: `Khách hàng ${i}`,
        email: `khachhang${i}@gmail.com`,
        password: defaultHashedPassword,
        phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        address: `Địa chỉ số ${i}, Thành phố X`,
      });
    }
    await User.bulkCreate(customers, { ignoreDuplicates: true });

    console.log("✅ Seed Master Data thành công!");
  } catch (error) {
    console.error("❌ Lỗi tại seedMasterData:", error);
    throw error;
  }
};

export default seedMasterData;
