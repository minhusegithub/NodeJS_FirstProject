import '../config/env.js';
import { sequelize } from '../models/sequelize/index.js';
import { QueryTypes } from 'sequelize';

const run = async () => {
    await sequelize.authenticate();

    const rows = await sequelize.query(`
        SELECT
            ts.id,
            ts.status,
            p.sku,
            p.title,
            ss.code  AS source_store,
            ds.code  AS dest_store,
            ts.suggested_qty,
            ROUND(ts.mfts_score::numeric, 4)       AS mfts_score,
            ROUND(ts.distance_km::numeric, 2)       AS distance_km,
            ROUND(ts.estimated_cost::numeric, 0)    AS estimated_cost,
            ts.expires_at,
            ts.calculated_at,
            ts.transfer_request_id
        FROM transfer_suggestions ts
        JOIN products p        ON p.id  = ts.product_id
        JOIN stores   ss       ON ss.id = ts.source_store_id
        JOIN stores   ds       ON ds.id = ts.dest_store_id
        ORDER BY ts.calculated_at DESC, ts.mfts_score DESC
    `, { type: QueryTypes.SELECT });

    console.log(`\n=== TRANSFER_SUGGESTIONS (${rows.length} rows) ===`);
    console.table(rows);

    // Group by (source, dest, product, status)
    const grouped = await sequelize.query(`
        SELECT
            ss.code  AS source,
            ds.code  AS dest,
            p.sku,
            ts.status,
            COUNT(*) AS count,
            MIN(ts.calculated_at) AS first_scan,
            MAX(ts.calculated_at) AS last_scan
        FROM transfer_suggestions ts
        JOIN products p ON p.id = ts.product_id
        JOIN stores ss ON ss.id = ts.source_store_id
        JOIN stores ds ON ds.id = ts.dest_store_id
        GROUP BY ss.code, ds.code, p.sku, ts.status
        ORDER BY count DESC, ss.code, ds.code
    `, { type: QueryTypes.SELECT });

    console.log('\n=== DUPLICATES ANALYSIS (grouped) ===');
    console.table(grouped);

    await sequelize.close();
    process.exit(0);
};

run().catch(err => { console.error(err); process.exit(1); });
