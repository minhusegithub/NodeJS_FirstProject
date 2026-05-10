/**
 * Script: Xóa toàn bộ dữ liệu trong các bảng Transfer
 *
 * Xóa theo thứ tự đúng để tránh lỗi FK constraint:
 *   1. inventory_transfer_items  (phụ thuộc inventory_transfer_requests)
 *   2. inventory_transfer_requests (phụ thuộc transfer_suggestions)
 *   3. transfer_suggestions
 *
 * Chạy: node scripts/clear-transfer-data.js
 */

import '../config/env.js';
import { sequelize } from '../models/sequelize/index.js';
import { QueryTypes } from 'sequelize';

const run = async () => {
    await sequelize.authenticate();
    console.log('✅ DB connected\n');

    // Đếm trước khi xóa
    const [countSuggestions] = await sequelize.query(
        'SELECT COUNT(*) AS count FROM transfer_suggestions', { type: QueryTypes.SELECT }
    );
    const [countRequests] = await sequelize.query(
        'SELECT COUNT(*) AS count FROM inventory_transfer_requests', { type: QueryTypes.SELECT }
    );
    const [countItems] = await sequelize.query(
        'SELECT COUNT(*) AS count FROM inventory_transfer_items', { type: QueryTypes.SELECT }
    );

    console.log('📊 Dữ liệu hiện tại:');
    console.log(`   transfer_suggestions:        ${countSuggestions.count} bản ghi`);
    console.log(`   inventory_transfer_requests: ${countRequests.count} bản ghi`);
    console.log(`   inventory_transfer_items:    ${countItems.count} bản ghi`);
    console.log();

    const transaction = await sequelize.transaction();
    try {
        // Hai bảng có circular FK:
        //   transfer_suggestions.transfer_request_id → inventory_transfer_requests
        //   inventory_transfer_requests.suggestion_id → transfer_suggestions
        // Giải pháp: NULL hóa FK trước, sau đó mới xóa

        // Bước 1: Bẻ vòng tròn
        await sequelize.query(
            'UPDATE transfer_suggestions SET transfer_request_id = NULL WHERE transfer_request_id IS NOT NULL',
            { transaction }
        );
        await sequelize.query(
            'UPDATE inventory_transfer_requests SET suggestion_id = NULL WHERE suggestion_id IS NOT NULL',
            { transaction }
        );

        // Bước 2: Xóa items trước (FK đơn giản)
        const [, r2] = await sequelize.query(
            'DELETE FROM inventory_transfer_items', { transaction }
        );
        // Bước 3: Xóa requests
        const [, r3] = await sequelize.query(
            'DELETE FROM inventory_transfer_requests', { transaction }
        );
        // Bước 4: Xóa suggestions
        const [, r1] = await sequelize.query(
            'DELETE FROM transfer_suggestions', { transaction }
        );

        await transaction.commit();

        console.log('🗑️  Đã xóa:');
        console.log(`   inventory_transfer_items:    ${r1?.rowCount ?? '?'} bản ghi`);
        console.log(`   inventory_transfer_requests: ${r2?.rowCount ?? '?'} bản ghi`);
        console.log(`   transfer_suggestions:        ${r3?.rowCount ?? '?'} bản ghi`);
        console.log('\n✅ Hoàn tất! Tất cả dữ liệu transfer đã được xóa sạch.');
        process.exit(0);
    } catch (err) {
        await transaction.rollback();
        console.error('❌ Lỗi:', err.message);
        process.exit(1);
    }
};

run();
