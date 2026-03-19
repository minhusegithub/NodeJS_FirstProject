import cron from 'node-cron';
import { QueryTypes } from 'sequelize';
import { sequelize, DsiReport } from '../models/sequelize/index.js';

const DSI_MIN_DAYS_STALE = 30;   // Điều kiện cần: phải ế ít nhất N ngày
const DSI_MAX_VELOCITY = 5;    // Điều kiện cần: tốc độ bán dưới N sp/30d
const DSI_CRITICAL_PCT = 0.10; // Top N% tệ nhất → CRITICAL

const buildStoreFilter = (storeId, allowedStoreIds) => {
    if (storeId) {
        return 'AND psi.store_id = :storeId';
    }

    if (allowedStoreIds !== null) {
        return 'AND psi.store_id IN (:allowedStoreIds)';
    }

    return '';
};

export const calculateAndSaveDSI = async ({ storeId = null, allowedStoreIds = null } = {}) => {
    const transaction = await sequelize.transaction();

    try {
        const replacements = {};
        const storeFilter = buildStoreFilter(storeId, allowedStoreIds);

        if (storeId) {
            replacements.storeId = Number(storeId);
        } else if (allowedStoreIds !== null) {
            replacements.allowedStoreIds = allowedStoreIds;
        }

        const rows = await sequelize.query(`
            WITH sales_data AS (
                SELECT
                    oi.product_id,
                    o.store_id,
                    MAX(o.created_at) AS last_sale_date,
                    COALESCE(
                        SUM(
                            CASE
                                WHEN o.created_at >= NOW() - INTERVAL '30 days' THEN oi.quantity
                                ELSE 0
                            END
                        ),
                        0
                    )::INT AS sales_last_30_days
                FROM order_items oi
                INNER JOIN orders o ON o.id = oi.order_id
                WHERE o.deleted_at IS NULL
                                    AND o.status = 'delivered'
                                    AND o.payment_status = 'paid'
                GROUP BY oi.product_id, o.store_id
            ),
            inventory_data AS (
                SELECT
                    psi.store_id,
                    psi.product_id,
                    psi.stock,
                    p.price::NUMERIC(15, 2) AS effective_price,
                    COALESCE(sd.last_sale_date, psi.last_restock_date, psi.created_at) AS reference_date,
                    COALESCE(sd.sales_last_30_days, 0)::INT AS velocity
                FROM product_store_inventory psi
                INNER JOIN products p ON p.id = psi.product_id AND p.deleted_at IS NULL
                LEFT JOIN sales_data sd ON sd.product_id = psi.product_id AND sd.store_id = psi.store_id
                WHERE psi.stock > 0
                  ${storeFilter}
            ),
            calculated AS (
                SELECT
                    id.store_id,
                    id.product_id,
                    id.stock,
                    (id.stock * id.effective_price)::NUMERIC(15, 2) AS capital_tied_up,
                    GREATEST(EXTRACT(DAY FROM NOW() - id.reference_date)::INT, 0) AS days_stale,
                    id.velocity,
                    (
                        GREATEST(EXTRACT(DAY FROM NOW() - id.reference_date)::INT, 0)
                        * (id.stock * id.effective_price)
                    ) / (id.velocity + 1)::NUMERIC AS dsi_score,
                    NOW() AS calculated_at
                FROM inventory_data id
            ),
            -- Điều kiện cần: chỉ lấy hàng ế đủ lâu VÀ bán cực chậm
            filtered AS (
                SELECT *
                FROM calculated
                WHERE days_stale > :minDaysStale
                  AND velocity < :maxVelocity
            ),
            -- Điều kiện đủ: xếp hạng tương đối trong tập đã lọc
            ranked AS (
                SELECT
                    store_id,
                    product_id,
                    PERCENT_RANK() OVER (ORDER BY dsi_score DESC) AS pct_rank
                FROM filtered
            )
            SELECT
                c.store_id,
                c.product_id,
                c.stock,
                c.capital_tied_up,
                c.days_stale,
                c.velocity,
                c.dsi_score,
                CASE
                    WHEN r.pct_rank IS NULL     THEN 'SAFE'
                    WHEN r.pct_rank <= :criticalPct THEN 'CRITICAL'
                    ELSE 'WARNING'
                END AS risk_level,
                c.calculated_at
            FROM calculated c
            LEFT JOIN ranked r
                ON r.product_id = c.product_id
               AND r.store_id   = c.store_id
            ORDER BY c.dsi_score DESC
        `, {
            replacements: {
                ...replacements,
                minDaysStale: DSI_MIN_DAYS_STALE,
                maxVelocity: DSI_MAX_VELOCITY,
                criticalPct: DSI_CRITICAL_PCT
            },
            type: QueryTypes.SELECT,
            transaction
        });

        if (storeId || allowedStoreIds !== null) {
            const deleteWhere = storeId
                ? 'WHERE store_id = :storeId'
                : 'WHERE store_id IN (:allowedStoreIds)';

            await sequelize.query(`DELETE FROM dsi_reports ${deleteWhere}`, {
                replacements,
                transaction
            });
        } else {
            await DsiReport.destroy({ where: {}, transaction });
        }

        if (rows.length > 0) {
            const records = rows.map(r => ({
                store_id: r.store_id,
                product_id: r.product_id,
                stock: r.stock,
                capital_tied_up: r.capital_tied_up,
                days_stale: r.days_stale,
                velocity: r.velocity,
                dsi_score: r.dsi_score,
                risk_level: r.risk_level,
                calculated_at: r.calculated_at
            }));

            await DsiReport.bulkCreate(records, {
                updateOnDuplicate: [
                    'stock',
                    'capital_tied_up',
                    'days_stale',
                    'velocity',
                    'dsi_score',
                    'risk_level',
                    'calculated_at',
                    'updated_at'
                ],
                transaction
            });
        }

        await transaction.commit();
        return rows;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

const getDateLabel = () => {
    const now = new Date();
    const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return vn.toISOString().replace('T', ' ').slice(0, 19);
};

export const startDSIAggregator = () => {
    // Recalculate every 1 hour (for development, set to every 6-12 hours in production)
    cron.schedule('0 * * * *', async () => {
        try {
            console.log(`⏰ [Cron DSI] Recalculating DSI at ${getDateLabel()}`);
            const rows = await calculateAndSaveDSI();
            console.log(`📦 [Cron DSI] Upserted ${rows.length} DSI records`);
        } catch (error) {
            console.error('❌ [Cron DSI] Recalculation failed:', error.message);
        }
    });

    // Startup run
    calculateAndSaveDSI()
        .then(rows => console.log(`📦 [Cron DSI] Initial upsert ${rows.length} records`))
        .catch(error => console.error('❌ [Cron DSI] Initial run failed:', error.message));

    console.log('📊 DSI cron job started');
};
