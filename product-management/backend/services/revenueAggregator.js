import cron from 'node-cron';
import { sequelize, StoreRevenueStat } from '../models/sequelize/index.js';
import { QueryTypes } from 'sequelize';

/**
 * Aggregate revenue data for a specific date range.
 * Idempotent: recalculates fully for each date (no incremental accumulation).
 * Only counts orders with status='delivered' AND payment_status='paid'.
 */
const aggregateRevenue = async (startDate, endDate) => {
    try {
        // Raw SQL for optimal aggregation performance
        const results = await sequelize.query(`
            SELECT 
                o.store_id,
                DATE(o.created_at) AS report_date,
                COALESCE(SUM(oi.total_price), 0) AS total_revenue,
                COUNT(DISTINCT o.id) AS total_orders,
                COUNT(DISTINCT o.user_id) AS unique_customers,
                COALESCE(SUM(oi.quantity), 0) AS total_items_sold
            FROM orders o
            INNER JOIN order_items oi ON oi.order_id = o.id
            WHERE o.status = 'delivered'
              AND o.payment_status = 'paid'
              AND o.deleted_at IS NULL
              AND DATE(o.created_at) BETWEEN :startDate AND :endDate
              AND o.store_id IS NOT NULL
            GROUP BY o.store_id, DATE(o.created_at)
        `, {
            replacements: { startDate, endDate },
            type: QueryTypes.SELECT
        });

        if (results.length === 0) {
            console.log(`📊 Revenue aggregation: No delivered+paid orders found for ${startDate} → ${endDate}`);
            return;
        }

        // UPSERT: Update if exists, Insert if not
        const records = results.map(r => ({
            store_id: r.store_id,
            report_date: r.report_date,
            total_revenue: r.total_revenue,
            total_orders: parseInt(r.total_orders),
            unique_customers: parseInt(r.unique_customers),
            total_items_sold: parseInt(r.total_items_sold)
        }));

        await StoreRevenueStat.bulkCreate(records, {
            updateOnDuplicate: ['total_revenue', 'total_orders', 'unique_customers', 'total_items_sold', 'updated_at']
        });

        console.log(`📊 Revenue aggregation: Updated ${records.length} records for ${startDate} → ${endDate}`);
    } catch (error) {
        console.error('❌ Revenue aggregation error:', error.message);
    }
};

/**
 * Get today's date and yesterday's date as YYYY-MM-DD strings (UTC+7).
 */
const getDateRange = () => {
    const now = new Date();
    // Adjust to UTC+7
    const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const today = vn.toISOString().split('T')[0];

    const yesterday = new Date(vn);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    return { today, yesterday: yesterdayStr };
};

/**
 * Start scheduled revenue aggregation cron jobs.
 */
export const startRevenueAggregator = () => {
    // TEST: Every 30 seconds (change back to '*/30 * * * *' for production)
    cron.schedule('*/30 * * * * *', async () => {
        const { today, yesterday } = getDateRange();
        console.log(`⏰ [Cron] Running revenue aggregation for ${yesterday} → ${today}`);
        await aggregateRevenue(yesterday, today);
    });

    // Daily at 1:05 AM (UTC+7): full recompute for yesterday
    cron.schedule('5 18 * * *', async () => {
        // 18:05 UTC = 01:05 UTC+7
        const { yesterday } = getDateRange();
        console.log(`⏰ [Cron Daily] Full recompute for ${yesterday}`);
        await aggregateRevenue(yesterday, yesterday);
    });

    console.log('📊 Revenue aggregator cron jobs started');

    // Run initial aggregation on startup (today + yesterday)
    const { today, yesterday } = getDateRange();
    aggregateRevenue(yesterday, today).catch(err => {
        console.error('❌ Initial revenue aggregation failed:', err.message);
    });
};

/**
 * Manual trigger for backfilling historical data.
 * Usage: await backfillRevenue('2025-01-01', '2025-12-31');
 */
export const backfillRevenue = async (startDate, endDate) => {
    console.log(`📊 Backfilling revenue data from ${startDate} to ${endDate}...`);
    await aggregateRevenue(startDate, endDate);
    console.log('📊 Backfill complete');
};
