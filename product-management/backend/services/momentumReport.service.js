import cron from 'node-cron';
import { QueryTypes } from 'sequelize';
import { sequelize, MomentumReport } from '../models/sequelize/index.js';

const classifyMomentumLabel = (momentumScore) => {
    if (momentumScore > 100) return 'SKYROCKETING';
    if (momentumScore > 20) return 'RISING';
    if (momentumScore < -20) return 'COOLING';
    return 'STABLE';
};

export const updateMomentumReports = async () => {
    const transaction = await sequelize.transaction();

    try {
        const query = `
            WITH sales_data AS (
                SELECT
                    o.store_id,
                    oi.product_id,
                    COALESCE(
                        SUM(
                            CASE
                                WHEN o.created_at >= NOW() - INTERVAL '7 days' THEN oi.quantity
                                ELSE 0
                            END
                        ),
                        0
                    )::INT AS current_qty,
                    COALESCE(
                        SUM(
                            CASE
                                WHEN o.created_at >= NOW() - INTERVAL '14 days'
                                 AND o.created_at < NOW() - INTERVAL '7 days' THEN oi.quantity
                                ELSE 0
                            END
                        ),
                        0
                    )::INT AS prev_qty
                FROM order_items oi
                INNER JOIN orders o ON oi.order_id = o.id
                WHERE o.status IN ('delivered', 'confirmed')
                  AND o.deleted_at IS NULL
                  AND o.store_id IS NOT NULL
                  AND o.created_at >= NOW() - INTERVAL '14 days'
                GROUP BY o.store_id, oi.product_id
            )
            SELECT
                sd.store_id,
                sd.product_id,
                sd.current_qty,
                sd.prev_qty,
                ((sd.current_qty - sd.prev_qty)::FLOAT / (sd.prev_qty + 1)) * 100 AS momentum_score
            FROM sales_data sd
        `;

        const results = await sequelize.query(query, {
            type: QueryTypes.SELECT,
            transaction
        });

        if (results.length === 0) {
            await transaction.commit();
            return [];
        }

        const records = results.map(item => {
            const score = parseFloat(item.momentum_score) || 0;

            return {
                store_id: item.store_id,
                product_id: item.product_id,
                current_qty: item.current_qty,
                prev_qty: item.prev_qty,
                momentum_score: score,
                label: classifyMomentumLabel(score),
                calculated_at: new Date()
            };
        });

        await MomentumReport.bulkCreate(records, {
            updateOnDuplicate: [
                'current_qty',
                'prev_qty',
                'momentum_score',
                'label',
                'calculated_at',
                'updated_at'
            ],
            transaction
        });

        await transaction.commit();
        return records;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

export const startMomentumAggregator = () => {
    // Dev/test schedule: every 30 seconds.
    // For production, use something like: '0 3 * * *' (daily at 03:00).
    cron.schedule('*/30 * * * * *', async () => {
        try {
            const records = await updateMomentumReports();
            console.log(`\uD83D\uDCC8 [Cron Momentum] Upserted ${records.length} records`);
        } catch (error) {
            console.error('\u274C [Cron Momentum] Update failed:', error.message);
        }
    });

    updateMomentumReports()
        .then(records => console.log(`\uD83D\uDCC8 [Cron Momentum] Initial upsert ${records.length} records`))
        .catch(error => console.error('\u274C [Cron Momentum] Initial run failed:', error.message));

    console.log('\uD83D\uDCC8 Momentum cron job started');
};
