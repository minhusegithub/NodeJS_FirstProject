/**
 * Script tạo các bảng mới cho tính năng Luân chuyển Tồn kho Thông minh.
 * Chạy: node scripts/add-inventory-transfer-tables.js
 *
 * Tạo mới 3 bảng:
 *   - transfer_suggestions      : Đề xuất chuyển kho do thuật toán MFTS sinh ra
 *   - inventory_transfer_requests : Phiếu chuyển kho (lifecycle từ draft → completed)
 *   - inventory_transfer_items  : Chi tiết sản phẩm trong từng phiếu chuyển kho
 *
 * An toàn: dùng CREATE TABLE IF NOT EXISTS, không đụng bảng hiện có.
 * Có thể chạy lại nhiều lần mà không gây lỗi.
 */
import '../config/env.js';
import { sequelize } from '../models/sequelize/index.js';

const run = async () => {
    console.log('🔄 Đang tạo các bảng cho tính năng Luân chuyển Tồn kho Thông minh...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Kết nối Database thành công!\n');

        // ─────────────────────────────────────────────────────────────
        // BẢNG 1: transfer_suggestions
        // ─────────────────────────────────────────────────────────────
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS transfer_suggestions (
                id                  SERIAL PRIMARY KEY,
                source_store_id     INTEGER NOT NULL REFERENCES stores(id),
                dest_store_id       INTEGER NOT NULL REFERENCES stores(id),
                product_id          INTEGER NOT NULL REFERENCES products(id),
                suggested_qty       INTEGER NOT NULL CHECK (suggested_qty >= 1),
                mfts_score          DECIMAL(8,4) NOT NULL,
                score_distance      DECIMAL(6,4) NOT NULL DEFAULT 0,
                score_surplus       DECIMAL(6,4) NOT NULL DEFAULT 0,
                score_cost          DECIMAL(6,4) NOT NULL DEFAULT 0,
                distance_km         DECIMAL(10,2) NOT NULL,
                estimated_cost      DECIMAL(15,2) NOT NULL,
                source_stock        INTEGER NOT NULL,
                dest_stock          INTEGER NOT NULL,
                dest_velocity       INTEGER NOT NULL DEFAULT 0,
                reason              TEXT,
                status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                                        CHECK (status IN ('pending','approved','rejected','expired')),
                reviewed_by         INTEGER REFERENCES users(id),
                reviewed_at         TIMESTAMPTZ,
                transfer_request_id INTEGER,
                expires_at          TIMESTAMPTZ NOT NULL,
                calculated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('  ✔ Bảng transfer_suggestions đã tạo (hoặc đã tồn tại)');

        // Indexes cho transfer_suggestions
        const suggestionIndexes = [
            `CREATE INDEX IF NOT EXISTS idx_ts_source_store   ON transfer_suggestions(source_store_id);`,
            `CREATE INDEX IF NOT EXISTS idx_ts_dest_store     ON transfer_suggestions(dest_store_id);`,
            `CREATE INDEX IF NOT EXISTS idx_ts_product        ON transfer_suggestions(product_id);`,
            `CREATE INDEX IF NOT EXISTS idx_ts_status         ON transfer_suggestions(status);`,
            `CREATE INDEX IF NOT EXISTS idx_ts_mfts_score     ON transfer_suggestions(mfts_score);`,
            `CREATE INDEX IF NOT EXISTS idx_ts_expires_at     ON transfer_suggestions(expires_at);`,
            `CREATE INDEX IF NOT EXISTS idx_ts_calculated_at  ON transfer_suggestions(calculated_at);`,
        ];
        for (const sql of suggestionIndexes) {
            await sequelize.query(sql);
        }
        console.log('  ✔ Indexes cho transfer_suggestions đã tạo\n');

        // ─────────────────────────────────────────────────────────────
        // BẢNG 2: inventory_transfer_requests
        // ─────────────────────────────────────────────────────────────
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS inventory_transfer_requests (
                id                  SERIAL PRIMARY KEY,
                transfer_code       VARCHAR(30) NOT NULL UNIQUE,
                source_store_id     INTEGER NOT NULL REFERENCES stores(id),
                dest_store_id       INTEGER NOT NULL REFERENCES stores(id),
                status              VARCHAR(30) NOT NULL DEFAULT 'draft'
                                        CHECK (status IN (
                                            'draft','pending_approval','approved',
                                            'in_transit','received','completed','cancelled'
                                        )),
                total_items         INTEGER NOT NULL DEFAULT 0,
                total_quantity      INTEGER NOT NULL DEFAULT 0,
                estimated_cost      DECIMAL(15,2),
                distance_km         DECIMAL(10,2),
                note                TEXT,
                suggestion_id       INTEGER REFERENCES transfer_suggestions(id),
                created_by          INTEGER REFERENCES users(id),
                approved_by         INTEGER REFERENCES users(id),
                shipped_at          TIMESTAMPTZ,
                received_at         TIMESTAMPTZ,
                completed_at        TIMESTAMPTZ,
                created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('  ✔ Bảng inventory_transfer_requests đã tạo (hoặc đã tồn tại)');

        // Indexes cho inventory_transfer_requests
        const requestIndexes = [
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_itr_code         ON inventory_transfer_requests(transfer_code);`,
            `CREATE INDEX IF NOT EXISTS idx_itr_source_store         ON inventory_transfer_requests(source_store_id);`,
            `CREATE INDEX IF NOT EXISTS idx_itr_dest_store           ON inventory_transfer_requests(dest_store_id);`,
            `CREATE INDEX IF NOT EXISTS idx_itr_status               ON inventory_transfer_requests(status);`,
            `CREATE INDEX IF NOT EXISTS idx_itr_suggestion_id        ON inventory_transfer_requests(suggestion_id);`,
            `CREATE INDEX IF NOT EXISTS idx_itr_created_by           ON inventory_transfer_requests(created_by);`,
            `CREATE INDEX IF NOT EXISTS idx_itr_created_at           ON inventory_transfer_requests(created_at);`,
        ];
        for (const sql of requestIndexes) {
            await sequelize.query(sql);
        }

        // Back-reference: transfer_suggestions.transfer_request_id → inventory_transfer_requests
        await sequelize.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'fk_ts_transfer_request_id'
                ) THEN
                    ALTER TABLE transfer_suggestions
                        ADD CONSTRAINT fk_ts_transfer_request_id
                        FOREIGN KEY (transfer_request_id)
                        REFERENCES inventory_transfer_requests(id);
                END IF;
            END
            $$;
        `);
        console.log('  ✔ Indexes + FK ngược (suggestion → request) đã tạo\n');

        // ─────────────────────────────────────────────────────────────
        // BẢNG 3: inventory_transfer_items
        // ─────────────────────────────────────────────────────────────
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS inventory_transfer_items (
                id                      SERIAL PRIMARY KEY,
                transfer_request_id     INTEGER NOT NULL
                                            REFERENCES inventory_transfer_requests(id)
                                            ON DELETE CASCADE,
                product_id              INTEGER NOT NULL REFERENCES products(id),
                quantity                INTEGER NOT NULL CHECK (quantity >= 1),
                received_quantity       INTEGER NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
                note                    TEXT,
                created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (transfer_request_id, product_id)
            );
        `);
        console.log('  ✔ Bảng inventory_transfer_items đã tạo (hoặc đã tồn tại)');

        // Indexes cho inventory_transfer_items
        const itemIndexes = [
            `CREATE INDEX IF NOT EXISTS idx_iti_request  ON inventory_transfer_items(transfer_request_id);`,
            `CREATE INDEX IF NOT EXISTS idx_iti_product  ON inventory_transfer_items(product_id);`,
        ];
        for (const sql of itemIndexes) {
            await sequelize.query(sql);
        }
        console.log('  ✔ Indexes cho inventory_transfer_items đã tạo\n');

        console.log('🎉 Hoàn tất! 3 bảng đã được tạo thành công trên production.');
        console.log('   - transfer_suggestions');
        console.log('   - inventory_transfer_requests');
        console.log('   - inventory_transfer_items');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ LỖI:', error.message);
        console.error(error);
        process.exit(1);
    }
};

run();
