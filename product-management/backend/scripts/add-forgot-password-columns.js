/**
 * Script thêm các cột mới vào bảng users cho tính năng Quên mật khẩu (OTP flow).
 * Chạy: node scripts/add-forgot-password-columns.js
 * 
 * An toàn: chỉ ALTER bảng users, không đụng đến bảng khác.
 * Dùng IF NOT EXISTS để chạy nhiều lần không bị lỗi.
 */
import '../config/env.js';
import { sequelize } from '../models/sequelize/index.js';

const run = async () => {
    console.log('🔄 Đang thêm các cột cho tính năng Quên mật khẩu...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Kết nối Database thành công!\n');

        const queries = [
            {
                label: 'reset_password_otp (VARCHAR 6)',
                sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_otp VARCHAR(6);`
            },
            {
                label: 'otp_expire (TIMESTAMP)',
                sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expire TIMESTAMPTZ;`
            },
            {
                label: 'reset_password_token (VARCHAR 500)',
                sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(500);`
            }
        ];

        for (const { label, sql } of queries) {
            await sequelize.query(sql);
            console.log(`  ✔ Đã thêm cột: ${label}`);
        }

        console.log('\n🎉 Hoàn tất! Bảng users đã được cập nhật.');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ LỖI:', error.message);
        process.exit(1);
    }
};

run();
