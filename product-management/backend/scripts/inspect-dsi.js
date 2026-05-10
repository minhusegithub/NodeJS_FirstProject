/**
 * Inspect dsi_reports + transfer suggestions context for HN01
 * Chạy: node scripts/inspect-dsi.js
 */
import '../config/env.js';
import { sequelize } from '../models/sequelize/index.js';
import { QueryTypes } from 'sequelize';

const run = async () => {
    await sequelize.authenticate();
    console.log('✅ DB connected\n');

    // 1. Tìm store HN01
    const [hn01] = await sequelize.query(`
        SELECT id, code, name FROM stores WHERE code = 'HN01' LIMIT 1
    `, { type: QueryTypes.SELECT });

    if (!hn01) { console.log('❌ Không tìm thấy cửa hàng HN01'); process.exit(1); }
    console.log(`🏪 Store: ${hn01.code} — ${hn01.name} (id=${hn01.id})\n`);

    // 2. DSI reports của HN01 — xem tình trạng tồn kho từng sản phẩm
    console.log('═══ DSI Reports cho HN01 ═══════════════════════════════════');
    const dsi = await sequelize.query(`
        SELECT
            d.product_id,
            p.title        AS product_title,
            p.sku,
            d.stock,
            d.capital_tied_up,
            d.days_stale,
            d.velocity,
            d.dsi_score,
            d.risk_level,
            d.calculated_at
        FROM dsi_reports d
        JOIN products p ON p.id = d.product_id
        WHERE d.store_id = :storeId
        ORDER BY d.risk_level, d.dsi_score DESC
        LIMIT 40
    `, { type: QueryTypes.SELECT, replacements: { storeId: hn01.id } });

    if (!dsi.length) {
        console.log('  (Không có dữ liệu DSI cho HN01)');
    } else {
        console.log(`  Tổng: ${dsi.length} sản phẩm\n`);
        console.log('  risk_level  | stock | days | velocity | dsi_score  | capital   | product');
        console.log('  ' + '-'.repeat(100));
        for (const r of dsi) {
            const title = (r.product_title || '').substring(0, 35).padEnd(35);
            console.log(
                `  ${(r.risk_level || '').padEnd(11)} | ` +
                `${String(r.stock).padStart(5)} | ` +
                `${String(r.days_stale).padStart(4)} | ` +
                `${String(r.velocity).padStart(8)} | ` +
                `${String(Number(r.dsi_score).toFixed(2)).padStart(10)} | ` +
                `${String(Number(r.capital_tied_up).toFixed(0)).padStart(9)} | ` +
                `${title} (id=${r.product_id})`
            );
        }
    }

    // 3. Transfer suggestions liên quan đến HN01 (nguồn hoặc đích)
    console.log('\n═══ Transfer Suggestions liên quan HN01 ════════════════════');
    const suggestions = await sequelize.query(`
        SELECT
            ts.id,
            ts.status,
            ss.code AS source_code,
            ds.code AS dest_code,
            p.title AS product_title,
            ts.suggested_qty,
            ts.source_stock,
            ts.dest_stock,
            ts.mfts_score,
            ts.reason
        FROM transfer_suggestions ts
        JOIN stores ss ON ss.id = ts.source_store_id
        JOIN stores ds ON ds.id = ts.dest_store_id
        JOIN products p ON p.id = ts.product_id
        WHERE ts.source_store_id = :storeId OR ts.dest_store_id = :storeId
        ORDER BY ts.created_at DESC
        LIMIT 20
    `, { type: QueryTypes.SELECT, replacements: { storeId: hn01.id } });

    if (!suggestions.length) {
        console.log('  (Chưa có đề xuất nào)');
    } else {
        for (const s of suggestions) {
            const title = (s.product_title || '').substring(0, 30);
            console.log(
                `\n  #${s.id} [${s.status}] ${s.source_code} → ${s.dest_code}` +
                `\n     Sản phẩm : ${title}` +
                `\n     Số lượng : ${s.suggested_qty} SP  |  source_stock=${s.source_stock}  dest_stock=${s.dest_stock}` +
                `\n     MFTS     : ${Number(s.mfts_score).toFixed(4)}` +
                `\n     Lý do    : ${(s.reason || '').substring(0, 120)}`
            );
        }
    }

    // 4. Tồn kho thực tế của HN01 theo product_store_inventory
    console.log('\n═══ Tồn kho thực tế HN01 (product_store_inventory) ════════');
    const inv = await sequelize.query(`
        SELECT
            psi.product_id,
            p.title,
            p.sku,
            psi.stock,
            psi.status
        FROM product_store_inventory psi
        JOIN products p ON p.id = psi.product_id
        WHERE psi.store_id = :storeId
        ORDER BY psi.stock DESC
        LIMIT 30
    `, { type: QueryTypes.SELECT, replacements: { storeId: hn01.id } });

    console.log(`  Tổng: ${inv.length} dòng\n`);
    console.log('  stock | status | sku              | product');
    console.log('  ' + '-'.repeat(80));
    for (const r of inv) {
        const title = (r.title || '').substring(0, 35).padEnd(35);
        console.log(
            `  ${String(r.stock).padStart(5)} | ${(r.status || '').padEnd(6)} | ` +
            `${(r.sku || '').padEnd(16)} | ${title}`
        );
    }

    console.log('\n✅ Done');
    process.exit(0);
};

run().catch(e => { console.error(e); process.exit(1); });
