import { sequelize } from '../models/sequelize/index.js';
import seedTransactions from './03_transactions.seed.js';
import seedAnalytics from './04_analytics.seed.js';

const runSeeders = async () => {
  try {
    console.log('🔄 Bắt đầu kết nối Database...');
    await sequelize.authenticate();
    console.log('✅ Kết nối thành công! Đang giữ nguyên dữ liệu Master & Inventory...');

    // KHÔNG DÙNG { force: true } NỮA ĐỂ GIỮ LẠI BẢNG VÀ DỮ LIỆU CŨ
    // await sequelize.sync(); 

    console.log('\n======================================');
    console.log('🚀 BƯỚC 3: BƠM THÊM ĐƠN HÀNG (Cập nhật từ lần chạy cuối đến nay)');
    await seedTransactions();

    console.log('\n======================================');
    console.log('🚀 BƯỚC 4: TÍNH TOÁN LẠI TOÀN BỘ BÁO CÁO ANALYTICS');
    await seedAnalytics();

    console.log('\n🎉🎉🎉 HOÀN TẤT! DỮ LIỆU ĐÃ ĐƯỢC CẬP NHẬT ĐẾN THỜI ĐIỂM HIỆN TẠI!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi nghiêm trọng:', error);
    process.exit(1);
  }
};

runSeeders();