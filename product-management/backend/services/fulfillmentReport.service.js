import cron from 'node-cron';
import { QueryTypes } from 'sequelize';
import { sequelize, FulfillmentReport } from '../models/sequelize/index.js';

const DEFAULT_SLA_TARGET_MINS = 240;

const resolveBottleneck = (t1, t2, t3) => {
    const maxTime = Math.max(t1, t2, t3);
    if (maxTime <= 60) return 'OPTIMAL';
    if (maxTime === t1) return 'LEAD_TIME';
    if (maxTime === t2) return 'FULFILLMENT';
    return 'DELIVERY';
};

export const generateDailyFulfillmentReport = async () => {
    const transaction = await sequelize.transaction();

    try {
        const results = await sequelize.query(`
            WITH daily_orders AS (
                SELECT
                    store_id,
                    id AS order_id,
                    EXTRACT(EPOCH FROM (confirmed_at - created_at)) / 60 AS lead_time,
                    EXTRACT(EPOCH FROM (shipped_at - confirmed_at)) / 60 AS fulfillment_time,
                    EXTRACT(EPOCH FROM (delivered_at - shipped_at)) / 60 AS delivery_time,
                    EXTRACT(EPOCH FROM (shipped_at - created_at)) / 60 AS total_internal_time
                FROM orders
                WHERE status = 'delivered'
                  AND deleted_at IS NULL
                  AND store_id IS NOT NULL
                  AND confirmed_at IS NOT NULL
                  AND shipped_at IS NOT NULL
                  AND delivered_at IS NOT NULL
                  AND DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
            )
            SELECT
                store_id,
                COUNT(order_id)::INT AS total_orders,
                ROUND(AVG(lead_time))::INT AS avg_lead_time_mins,
                ROUND(AVG(fulfillment_time))::INT AS avg_fulfillment_time_mins,
                ROUND(AVG(delivery_time))::INT AS avg_delivery_time_mins,
                SUM(CASE WHEN total_internal_time <= :slaTarget THEN 1 ELSE 0 END)::INT AS sla_compliant_orders
            FROM daily_orders
            GROUP BY store_id
        `, {
            replacements: { slaTarget: DEFAULT_SLA_TARGET_MINS },
            type: QueryTypes.SELECT,
            transaction
        });

        if (results.length === 0) {
            await transaction.commit();
            return [];
        }

        const reportDate = new Date();
        reportDate.setDate(reportDate.getDate() - 1);
        const reportDateString = reportDate.toISOString().split('T')[0];

        const formattedReports = results.map(row => {
            const total = parseInt(row.total_orders, 10) || 0;
            const compliant = parseInt(row.sla_compliant_orders, 10) || 0;
            const t1 = parseFloat(row.avg_lead_time_mins) || 0;
            const t2 = parseFloat(row.avg_fulfillment_time_mins) || 0;
            const t3 = parseFloat(row.avg_delivery_time_mins) || 0;
            const rate = total > 0 ? ((compliant / total) * 100) : 0;

            return {
                store_id: row.store_id,
                report_date: reportDateString,
                total_orders: total,
                avg_lead_time_mins: Math.round(t1),
                avg_fulfillment_time_mins: Math.round(t2),
                avg_delivery_time_mins: Math.round(t3),
                sla_target_mins: DEFAULT_SLA_TARGET_MINS,
                sla_compliant_orders: compliant,
                sla_compliance_rate: rate.toFixed(2),
                bottleneck_stage: resolveBottleneck(t1, t2, t3),
                calculated_at: new Date()
            };
        });

        await FulfillmentReport.bulkCreate(formattedReports, {
            updateOnDuplicate: [
                'total_orders',
                'avg_lead_time_mins',
                'avg_fulfillment_time_mins',
                'avg_delivery_time_mins',
                'sla_target_mins',
                'sla_compliant_orders',
                'sla_compliance_rate',
                'bottleneck_stage',
                'calculated_at',
                'updated_at'
            ],
            transaction
        });

        await transaction.commit();
        return formattedReports;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

export const startFulfillmentAggregator = () => {
    // Test schedule: every 30 minutes.
    // Production recommendation: 0 1 * * * (01:00 everyday).
    cron.schedule('*/30 * * * *', async () => {
        try {
            const reports = await generateDailyFulfillmentReport();
            console.log(` [Cron Fulfillment] Upserted ${reports.length} records`);
        } catch (error) {
            console.error('\u274C [Cron Fulfillment] Generate failed:', error.message);
        }
    });

    console.log(' Fulfillment cron job started');
};
