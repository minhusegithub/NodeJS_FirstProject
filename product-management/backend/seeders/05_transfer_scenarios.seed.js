/**
 * Seeder: Tạo kịch bản mất cân bằng tồn kho để demo tính năng Smart Transfer
 *
 * Dựa trên data thực tế (inspect-data.js):
 *   - 3 stores tất cả ở Hà Nội: HN01(id=1), HN02(id=2), HN03(id=3)
 *   - 20 products: DSI-001~005, MOM-001~005, COW-001~010
 *
 * Chiến lược: CHỈ UPDATE stock + velocity, không tạo/xóa bất kỳ bản ghi nào.
 * Idempotent: chạy nhiều lần cho cùng một kết quả.
 *
 * 4 kịch bản demo:
 *   KC1 - "Trend cháy hàng": Tai nghe X1 (MOM-001, id=6)
 *         HN01 + HN02 bán rất chạy → cạn kho → MFTS tìm HN03 (dư ~480)
 *
 *   KC2 - "Son hot trend" : Son kem lì (MOM-003, id=8)
 *         HN01 bán nhanh → cạn kho → MFTS ưu tiên HN02 gần hơn HN03
 *
 *   KC3 - "Thiếu nội vùng": Cáp sạc (COW-001, id=11)
 *         HN02 hết hàng → HN01 gần nhất và đang dư → được chọn trước HN03
 *
 *   KC4 - "Khẩn cấp tuyệt đối": Sữa rửa mặt (COW-004, id=14)
 *         HN01 stock=0 → S_urgency = 1.0 (cao nhất có thể) → ưu tiên tuyệt đối
 *
 * Kết quả mong đợi khi gọi POST /api/v1/admin/transfer/suggestions/scan:
 *   { demands: 5, supply_sources: ≥3, suggestions: 5 }
 *
 * Chạy: node seeders/05_transfer_scenarios.seed.js
 */

import '../config/env.js';
import { sequelize } from '../models/sequelize/index.js';
import { QueryTypes } from 'sequelize';

// ─── Thông số thuật toán (phải khớp với transferEngine.service.js) ─────────
const LEAD_TIME_DAYS = 2;
const SAFETY_FACTOR  = 1.5;

const calcReorderPoint = (velocity) => {
    const dailyRate = velocity / 30;
    return Math.max(Math.ceil(dailyRate * LEAD_TIME_DAYS * SAFETY_FACTOR), 1);
};

// ─── Data kịch bản ────────────────────────────────────────────────────────
// Mỗi entry: { store_id, product_id, new_stock, new_velocity, scenario, role }
// role: 'DEMAND' = thiếu hàng | 'SUPPLY' = có hàng dư
const SCENARIOS = [
    // ═══════════════════════════════════════════════════════════════════
    // KC1: Tai nghe Bluetooth X1 (product_id=6, MOM-001)
    // Câu chuyện: Influencer review viral → HN01 & HN02 bán cháy hàng,
    //             HN03 trưng bày ít nên còn nhiều tồn
    // ═══════════════════════════════════════════════════════════════════
    {
        store_id: 1, product_id: 6,
        new_stock: 1, new_velocity: 30,
        scenario: 'KC1', role: 'DEMAND',
        note: 'HN01 bán 30 SP/tháng, còn 1 → RP=3 → DEMAND'
    },
    {
        store_id: 2, product_id: 6,
        new_stock: 2, new_velocity: 25,
        scenario: 'KC1', role: 'DEMAND',
        note: 'HN02 bán 25 SP/tháng, còn 2 → RP=3 → DEMAND'
    },
    {
        store_id: 3, product_id: 6,
        new_stock: 481, new_velocity: 3,
        scenario: 'KC1', role: 'SUPPLY',
        note: 'HN03 bán ít (3 SP/tháng), còn 481 → RP=1 → threshold=2 → SUPPLY dư 480'
    },

    // ═══════════════════════════════════════════════════════════════════
    // KC2: Son kem lì màu Đỏ Gạch Hot Trend (product_id=8, MOM-003)
    // Câu chuyện: Trend TikTok → HN01 tập trung giới trẻ bán cực chạy,
    //             HN02 & HN03 khu dân cư lớn tuổi → bán ít → dư nhiều
    // Demo S_distance: HN02 gần HN01 hơn HN03 → ưu tiên nhận đề xuất trước
    // ═══════════════════════════════════════════════════════════════════
    {
        store_id: 1, product_id: 8,
        new_stock: 1, new_velocity: 22,
        scenario: 'KC2', role: 'DEMAND',
        note: 'HN01 bán 22 SP/tháng, còn 1 → RP=3 → DEMAND'
    },
    {
        store_id: 2, product_id: 8,
        new_stock: 311, new_velocity: 2,
        scenario: 'KC2', role: 'SUPPLY',
        note: 'HN02 bán ít, còn 311 → RP=1 → SUPPLY (gần HN01 ~4km)'
    },
    {
        store_id: 3, product_id: 8,
        new_stock: 305, new_velocity: 2,
        scenario: 'KC2', role: 'SUPPLY',
        note: 'HN03 bán ít, còn 305 → RP=1 → SUPPLY (xa HN01 hơn ~5.1km)'
    },

    // ═══════════════════════════════════════════════════════════════════
    // KC3: Cáp sạc nhanh Type-C (product_id=11, COW-001)
    // Câu chuyện: HN02 vùng văn phòng → nhân viên mua nhiều,
    //             HN01 & HN03 còn nhiều → MFTS ưu tiên HN01 (gần hơn)
    // Demo S_surplus: HN01 vs HN03 đều dư → chọn theo khoảng cách
    // ═══════════════════════════════════════════════════════════════════
    {
        store_id: 2, product_id: 11,
        new_stock: 1, new_velocity: 20,
        scenario: 'KC3', role: 'DEMAND',
        note: 'HN02 vùng VP bán 20/tháng, còn 1 → RP=2 → DEMAND'
    },
    {
        store_id: 1, product_id: 11,
        new_stock: 1537, new_velocity: 6,
        scenario: 'KC3', role: 'SUPPLY',
        note: 'HN01 còn 1537 → RP=1 → transferable=1536 (gần HN02 ~4km)'
    },
    {
        store_id: 3, product_id: 11,
        new_stock: 1880, new_velocity: 7,
        scenario: 'KC3', role: 'SUPPLY',
        note: 'HN03 còn 1880 → RP=1 → transferable=1879 (xa HN02 hơn ~2.2km)'
    },

    // ═══════════════════════════════════════════════════════════════════
    // KC4: Sữa rửa mặt trị mụn (product_id=14, COW-004)
    // Câu chuyện: HN01 xả hàng khuyến mãi cuối tháng → hết sạch hoàn toàn
    //             S_urgency = (RP - 0) / RP = 1.0 → mức cao nhất có thể
    // Demo S_urgency: Cùng khoảng cách tương đương, HN01 được ưu tiên hơn
    //                 vì stock=0 (urgent) so với stock=1 ở KC3
    // ═══════════════════════════════════════════════════════════════════
    {
        store_id: 1, product_id: 14,
        new_stock: 0, new_velocity: 15,
        scenario: 'KC4', role: 'DEMAND',
        note: 'HN01 hết sạch! bán 15/tháng → RP=2 → S_urgency=(2-0)/2=1.0 (MAX)'
    },
    {
        store_id: 2, product_id: 14,
        new_stock: 1398, new_velocity: 8,
        scenario: 'KC4', role: 'SUPPLY',
        note: 'HN02 còn 1398 → RP=1 → transferable=1397 (gần HN01 ~4km)'
    },
    {
        store_id: 3, product_id: 14,
        new_stock: 1878, new_velocity: 3,
        scenario: 'KC4', role: 'SUPPLY',
        note: 'HN03 còn 1878 → RP=1 → transferable=1877 (xa HN01 hơn ~5.1km)'
    }
];

const run = async () => {
    await sequelize.authenticate();
    console.log('✅ DB connected\n');
    console.log('🎬 Đang tạo kịch bản demo Smart Inventory Transfer...\n');

    // Preview: tính REORDER_POINT để verify
    console.log('📐 Xác minh REORDER_POINT cho từng kịch bản:');
    for (const s of SCENARIOS) {
        const rp = calcReorderPoint(s.new_velocity);
        const isDemand = s.new_stock <= rp;
        const isSupply = s.new_stock > rp * 2;
        const emoji = s.role === 'DEMAND' ? '🔴' : '🟢';
        const status = isDemand ? 'DEMAND ✅' : (isSupply ? 'SUPPLY ✅' : '⚠️ NEITHER');
        console.log(`  ${emoji} Store${s.store_id} × P${s.product_id}: stock=${s.new_stock}, velocity=${s.new_velocity}, RP=${rp} → ${status}`);
    }
    console.log();

    const transaction = await sequelize.transaction();
    try {
        let updatedInventory = 0;
        let updatedDsi = 0;

        for (const s of SCENARIOS) {
            // 1. Cập nhật stock trong product_store_inventory
            const [, inventoryRows] = await sequelize.query(`
                UPDATE product_store_inventory
                SET stock = :stock, updated_at = NOW()
                WHERE store_id = :store_id AND product_id = :product_id
            `, {
                replacements: {
                    stock: s.new_stock,
                    store_id: s.store_id,
                    product_id: s.product_id
                },
                transaction
            });
            updatedInventory++;

            // 2. Upsert velocity vào dsi_reports
            //    Dùng INSERT ... ON CONFLICT để tạo nếu chưa có hoặc update nếu đã có
            const rp = calcReorderPoint(s.new_velocity);
            const daysStale = s.new_velocity > 0
                ? (s.new_stock > 0 ? Math.floor(s.new_stock / (s.new_velocity / 30)) : 0)
                : 999;

            await sequelize.query(`
                INSERT INTO dsi_reports
                    (store_id, product_id, stock, velocity, capital_tied_up, days_stale, dsi_score, risk_level, calculated_at, created_at, updated_at)
                VALUES
                    (:store_id, :product_id, :stock, :velocity, :capital_tied_up, :days_stale, :dsi_score, :risk_level, NOW(), NOW(), NOW())
                ON CONFLICT (store_id, product_id)
                DO UPDATE SET
                    velocity        = EXCLUDED.velocity,
                    stock           = EXCLUDED.stock,
                    capital_tied_up = EXCLUDED.capital_tied_up,
                    days_stale      = EXCLUDED.days_stale,
                    dsi_score       = EXCLUDED.dsi_score,
                    risk_level      = EXCLUDED.risk_level,
                    updated_at      = NOW()
            `, {
                replacements: {
                    store_id: s.store_id,
                    product_id: s.product_id,
                    stock: s.new_stock,
                    velocity: s.new_velocity,
                    capital_tied_up: 0,  // sẽ được tính lại khi cron DSI chạy
                    days_stale: daysStale,
                    dsi_score: daysStale > 120 ? 10 : (daysStale > 60 ? 7 : 3),
                    risk_level: daysStale > 120 ? 'CRITICAL' : (daysStale > 60 ? 'WARNING' : 'SAFE')
                },
                transaction
            });
            updatedDsi++;
        }

        await transaction.commit();

        console.log(`✅ Đã cập nhật ${updatedInventory} bản ghi product_store_inventory`);
        console.log(`✅ Đã upsert ${updatedDsi} bản ghi dsi_reports (velocity)\n`);

        // Verify lại từ DB
        console.log('🔍 Xác nhận kết quả trong DB:');
        const verify = await sequelize.query(`
            SELECT
                s.code        AS store,
                p.sku,
                p.title,
                psi.stock     AS stock_moi,
                COALESCE(d.velocity, 0) AS velocity,
                CASE
                    WHEN psi.stock <= GREATEST(CEIL((COALESCE(d.velocity,0) / 30.0) * 2 * 1.5), 1)
                    THEN '🔴 DEMAND'
                    WHEN psi.stock > GREATEST(CEIL((COALESCE(d.velocity,0) / 30.0) * 2 * 1.5), 1) * 2
                    THEN '🟢 SUPPLY'
                    ELSE '🟡 BUFFER'
                END           AS trang_thai
            FROM product_store_inventory psi
            JOIN stores s ON s.id = psi.store_id
            JOIN products p ON p.id = psi.product_id
            LEFT JOIN dsi_reports d ON d.store_id = psi.store_id AND d.product_id = psi.product_id
            WHERE psi.product_id IN (6, 8, 11, 14)
            ORDER BY psi.product_id, psi.store_id
        `, { type: QueryTypes.SELECT });

        console.table(verify);

        console.log('\n🎉 Kịch bản demo đã sẵn sàng!');
        console.log('👉 Gọi POST /api/v1/admin/transfer/suggestions/scan để xem kết quả.');
        console.log('   Kỳ vọng: demands=5, suggestions=5\n');
        process.exit(0);
    } catch (err) {
        await transaction.rollback();
        console.error('❌ Lỗi:', err.message);
        console.error(err);
        process.exit(1);
    }
};

run();
