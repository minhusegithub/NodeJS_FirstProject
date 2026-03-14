import { sequelize } from "../models/sequelize/index.js"; // Điều chỉnh đường dẫn
import seedMasterData from "./01_masterData.seed.js";
import seedInventory from "./02_inventory.seed.js";
import seedTransactions from "./03_transactions.seed.js";
import seedAnalytics from "./04_analytics.seed.js";

const runSeeders = async () => {
  try {
    console.log("🔄 Bắt đầu kết nối Database...");
    await sequelize.authenticate();
    console.log("✅ Kết nối thành công!");

    // ---------------------------------------------------------
    // BƯỚC 0: DỌN DẸP CHIẾN TRƯỜNG (HARD RESET)
    // ---------------------------------------------------------
    console.log(
      "\n⚠️ ĐANG XÓA TRẮNG DATABASE (Cẩn thận: Lệnh này Drop toàn bộ bảng)...",
    );

    // force: true sẽ DROP toàn bộ các bảng hiện có và CREATE lại cấu trúc bảng mới tinh
    // Điều này dọn sạch cả dữ liệu rác lẫn các lỗi thay đổi cấu trúc Model cũ.
    await sequelize.sync({ force: true });

    console.log("✅ Đã dọn dẹp sạch sẽ! Database hiện tại hoàn toàn trống.");

    // ---------------------------------------------------------
    // BƯỚC 1: ĐỔ DỮ LIỆU
    // ---------------------------------------------------------
    console.log("\n======================================");
    console.log("🚀 BƯỚC 1: ĐỔ DỮ LIỆU MASTER (Role, Store, User, Staff)");
    await seedMasterData();

    // Các bước sau sẽ mở comment khi code xong
    console.log('\n======================================');
    console.log('🚀 BƯỚC 2: ĐỔ DỮ LIỆU HÀNG HÓA & TỒN KHO');
    await seedInventory();

    console.log('\n======================================');
    console.log('🚀 BƯỚC 3: CỖ MÁY THỜI GIAN (Tạo Giao dịch & Đơn hàng)');
    await seedTransactions();

    console.log('\n======================================');  
    console.log('🚀 BƯỚC 4: DỮ LIỆU PHÂN TÍCH (Báo cáo doanh thu, tồn kho, v.v.)')
    await seedAnalytics();

    console.log("\n🎉🎉🎉 HOÀN TẤT TOÀN BỘ QUÁ TRÌNH SEED DỮ LIỆU!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi nghiêm trọng khi chạy Seeder:", error);
    process.exit(1);
  }
};

runSeeders();
