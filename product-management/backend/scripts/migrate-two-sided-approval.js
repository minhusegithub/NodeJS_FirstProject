/**
 * Migration: Thêm cột two-sided approval vào transfer_suggestions
 *
 * Thêm 4 cột:
 *   - source_approved_by  (int, nullable FK → users)
 *   - source_approved_at  (timestamp, nullable)
 *   - dest_approved_by    (int, nullable FK → users)
 *   - dest_approved_at    (timestamp, nullable)
 *
 * Đồng thời mở rộng enum status để chứa 'source_approved', 'dest_approved'
 *
 * Chạy: node scripts/migrate-two-sided-approval.js
 */

import '../config/env.js';
import { sequelize } from '../models/sequelize/index.js';
import { QueryTypes } from 'sequelize';

const run = async () => {
    await sequelize.authenticate();
    console.log('✅ DB connected\n');

    const transaction = await sequelize.transaction();
    try {
        // 1. Thêm cột source_approved_by
        await sequelize.query(`
            ALTER TABLE transfer_suggestions
            ADD COLUMN IF NOT EXISTS source_approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
        `, { transaction });
        console.log('  ✔ source_approved_by');

        // 2. Thêm cột source_approved_at
        await sequelize.query(`
            ALTER TABLE transfer_suggestions
            ADD COLUMN IF NOT EXISTS source_approved_at TIMESTAMP WITH TIME ZONE
        `, { transaction });
        console.log('  ✔ source_approved_at');

        // 3. Thêm cột dest_approved_by
        await sequelize.query(`
            ALTER TABLE transfer_suggestions
            ADD COLUMN IF NOT EXISTS dest_approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
        `, { transaction });
        console.log('  ✔ dest_approved_by');

        // 4. Thêm cột dest_approved_at
        await sequelize.query(`
            ALTER TABLE transfer_suggestions
            ADD COLUMN IF NOT EXISTS dest_approved_at TIMESTAMP WITH TIME ZONE
        `, { transaction });
        console.log('  ✔ dest_approved_at');

        // 5. Mở rộng validation status (PostgreSQL VARCHAR không có enum constraint cứng ở đây,
        //    chỉ Sequelize validate — nên chỉ cần kiểm tra column type là VARCHAR)
        //    Nếu bạn dùng CHECK constraint ở DB level thì cần drop + recreate.
        //    Kiểm tra xem có CHECK constraint không:
        const [checkConstraint] = await sequelize.query(`
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'transfer_suggestions'
              AND constraint_type = 'CHECK'
              AND constraint_name LIKE '%status%'
            LIMIT 1
        `, { type: QueryTypes.SELECT, transaction });

        if (checkConstraint) {
            await sequelize.query(`
                ALTER TABLE transfer_suggestions
                DROP CONSTRAINT "${checkConstraint.constraint_name}"
            `, { transaction });
            console.log(`  ✔ Dropped old status CHECK constraint: ${checkConstraint.constraint_name}`);
        }

        // Thêm CHECK constraint mới với đầy đủ các status
        await sequelize.query(`
            ALTER TABLE transfer_suggestions
            ADD CONSTRAINT transfer_suggestions_status_check
            CHECK (status IN (
                'pending',
                'source_approved',
                'dest_approved',
                'approved',
                'rejected',
                'expired'
            ))
        `, { transaction });
        console.log('  ✔ New status CHECK constraint added');

        await transaction.commit();
        console.log('\n✅ Migration hoàn tất!');
        process.exit(0);
    } catch (err) {
        await transaction.rollback();
        console.error('\n❌ Migration thất bại:', err.message);
        process.exit(1);
    }
};

run();
