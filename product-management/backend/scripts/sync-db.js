import '../config/env.js';
import { sequelize } from '../models/sequelize/index.js';

console.log('🔄 Đang kết nối và đồng bộ Cấu trúc Database...');


// Nếu Table bị thiếu -> Tạo mới.
// Nếu Table bị sai cột -> Tự động Update/Alter Cột.
sequelize.sync()
    .then(() => {
        console.log('✅ CHÚC MỪNG! Database đã được cập nhật thành công với Code Model hiện tại!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ LỖI ĐỒNG BỘ YÊU CẦU KIỂM TRA LẠI:');
        console.error(error);
        process.exit(1);
    });
