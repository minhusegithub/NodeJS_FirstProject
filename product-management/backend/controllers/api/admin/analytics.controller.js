import {
    StoreRevenueStat,
    MomentumReport,
    DsiReport,
    Product,
    Store,
    sequelize
} from '../../../models/sequelize/index.js';
import { Op, QueryTypes } from 'sequelize';
import { redisGet, redisSet } from '../../../config/redis.js';
import { hashQueryKey } from '../../../helpers/cacheKey.js';
import { calculateAndSaveDSI } from '../../../services/dsiReport.service.js';

// Helper to get allowed store IDs for the current user
const getAllowedStoreIds = (user) => {
    const roles = user.roles || [];
    if (roles.some(r => r.roleName === 'SystemAdmin')) {
        return null; // SystemAdmin sees all
    }
    const storeIds = roles.map(r => r.storeId).filter(id => id);
    return [...new Set(storeIds)];
};

// [GET] /api/v1/admin/analytics
// Revenue overview + daily trend data
export const getRevenueOverview = async (req, res) => {
    try {
        const { from, to, store_id } = req.query;
        const allowedStoreIds = getAllowedStoreIds(req.user);

        if (allowedStoreIds !== null && allowedStoreIds.length === 0) {
            return res.json({ code: 200, message: 'Success', data: { summary: { totalRevenue: 0, totalOrders: 0, uniqueCustomers: 0, totalItemsSold: 0 }, daily: [] } });
        }

        // Cache check: include MAX(updated_at) so cache auto-invalidates when cron updates DB
        const latestStatAt = await StoreRevenueStat.max('updated_at', {
            where: {
                report_date: {
                    [Op.between]: [
                        from || (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })(),
                        to || new Date().toISOString().split('T')[0]
                    ]
                },
                ...(store_id ? { store_id: parseInt(store_id, 10) } : allowedStoreIds !== null ? { store_id: { [Op.in]: allowedStoreIds } } : {})
            }
        });
        const cacheKey = hashQueryKey('analytics:revenue:v3', { from, to, store_id, allowedStoreIds, latestStatAt });
        const cached = await redisGet(cacheKey);
        if (cached) {
            return res.json({ code: 200, message: 'Success (cached)', data: JSON.parse(cached) });
        }

        // Date defaults: last 30 days
        const endDate = to || new Date().toISOString().split('T')[0];
        const startDate = from || (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })();

        // Build where clause
        const where = {
            report_date: { [Op.between]: [startDate, endDate] }
        };

        if (store_id) {
            where.store_id = parseInt(store_id, 10);
        } else if (allowedStoreIds !== null) {
            where.store_id = { [Op.in]: allowedStoreIds };
        }
        // Summary + daily using raw SQL (avoids Sequelize ORM type casting issues)
        let summaryResult;
        if (store_id) {
            const results = await sequelize.query(`
                SELECT 
                    COALESCE(SUM(total_revenue), 0) AS "totalRevenue",
                    COALESCE(SUM(total_orders), 0) AS "totalOrders",
                    COALESCE(SUM(unique_customers), 0) AS "uniqueCustomers",
                    COALESCE(SUM(total_items_sold), 0) AS "totalItemsSold"
                FROM store_revenue_stats
                WHERE store_id = :storeId
                  AND report_date BETWEEN :startDate AND :endDate
            `, {
                replacements: { storeId: parseInt(store_id, 10), startDate, endDate },
                type: QueryTypes.SELECT
            });
            summaryResult = results[0] || { totalRevenue: 0, totalOrders: 0, uniqueCustomers: 0, totalItemsSold: 0 };
        } else if (allowedStoreIds !== null && allowedStoreIds.length > 0) {
            const results = await sequelize.query(`
                SELECT 
                    COALESCE(SUM(total_revenue), 0) AS "totalRevenue",
                    COALESCE(SUM(total_orders), 0) AS "totalOrders",
                    COALESCE(SUM(unique_customers), 0) AS "uniqueCustomers",
                    COALESCE(SUM(total_items_sold), 0) AS "totalItemsSold"
                FROM store_revenue_stats
                WHERE store_id IN (:storeIds)
                  AND report_date BETWEEN :startDate AND :endDate
            `, {
                replacements: { storeIds: allowedStoreIds, startDate, endDate },
                type: QueryTypes.SELECT
            });
            summaryResult = results[0] || { totalRevenue: 0, totalOrders: 0, uniqueCustomers: 0, totalItemsSold: 0 };
        } else {
            const results = await sequelize.query(`
                SELECT 
                    COALESCE(SUM(total_revenue), 0) AS "totalRevenue",
                    COALESCE(SUM(total_orders), 0) AS "totalOrders",
                    COALESCE(SUM(unique_customers), 0) AS "uniqueCustomers",
                    COALESCE(SUM(total_items_sold), 0) AS "totalItemsSold"
                FROM store_revenue_stats
                WHERE report_date BETWEEN :startDate AND :endDate
            `, {
                replacements: { startDate, endDate },
                type: QueryTypes.SELECT
            });
            summaryResult = results[0] || { totalRevenue: 0, totalOrders: 0, uniqueCustomers: 0, totalItemsSold: 0 };
        }

        // Daily trend
        const daily = await StoreRevenueStat.findAll({
            where,
            attributes: [
                'report_date',
                [sequelize.fn('SUM', sequelize.col('total_revenue')), 'revenue'],
                [sequelize.fn('SUM', sequelize.col('total_orders')), 'orders']
            ],
            group: ['report_date'],
            order: [['report_date', 'ASC']],
            raw: true
        });

        const data = {
            summary: {
                totalRevenue: parseFloat(summaryResult.totalRevenue) || 0,
                totalOrders: parseInt(summaryResult.totalOrders) || 0,
                uniqueCustomers: parseInt(summaryResult.uniqueCustomers) || 0,
                totalItemsSold: parseInt(summaryResult.totalItemsSold) || 0
            },
            daily: daily.map(d => ({
                date: d.report_date,
                revenue: parseFloat(d.revenue) || 0,
                orders: parseInt(d.orders) || 0
            }))
        };

        await redisSet(cacheKey, JSON.stringify(data), 1800); // 30 min TTL

        res.json({ code: 200, message: 'Success', data });
    } catch (error) {
        console.error('Revenue Overview Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error', error: error.message });
    }
};

// [GET] /api/v1/admin/analytics/store-performance
// Compare revenue across stores (SystemAdmin only)
export const getStorePerformance = async (req, res) => {
    try {
        const { from, to } = req.query;

        const cacheKey = hashQueryKey('analytics:store-perf:v2', { from, to });
        const cached = await redisGet(cacheKey);
        if (cached) {
            return res.json({ code: 200, message: 'Success (cached)', data: JSON.parse(cached) });
        }

        const endDate = to || new Date().toISOString().split('T')[0];
        const startDate = from || (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })();

        const results = await sequelize.query(`
            SELECT 
                s.id AS "storeId",
                s.name AS "storeName",
                s.code AS "storeCode",
                COALESCE(SUM(srs.total_revenue), 0) AS revenue,
                COALESCE(SUM(srs.total_orders), 0) AS orders,
                CASE 
                    WHEN COALESCE(SUM(srs.total_orders), 0) = 0 THEN 0
                    ELSE ROUND(SUM(srs.total_revenue) / SUM(srs.total_orders), 2)
                END AS "avgOrderValue"
            FROM stores s
            LEFT JOIN store_revenue_stats srs 
                ON srs.store_id = s.id 
                AND srs.report_date >= :startDate::date
                AND srs.report_date <= :endDate::date
            WHERE s.is_active = true
            GROUP BY s.id, s.name, s.code
            ORDER BY revenue DESC
        `, {
            replacements: { startDate, endDate },
            type: QueryTypes.SELECT
        });

        const data = {
            stores: results.map(r => ({
                storeId: r.storeId,
                storeName: r.storeName,
                storeCode: r.storeCode,
                revenue: parseFloat(r.revenue) || 0,
                orders: parseInt(r.orders) || 0,
                avgOrderValue: parseFloat(r.avgOrderValue) || 0
            }))
        };

        await redisSet(cacheKey, JSON.stringify(data), 1800);

        res.json({ code: 200, message: 'Success', data });
    } catch (error) {
        console.error('Store Performance Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error', error: error.message });
    }
};

// [GET] /api/v1/admin/analytics/best-sellers
export const getBestSellers = async (req, res) => {
    try {
        const { store_id, limit = 10, sort_by = 'momentum' } = req.query;
        const allowedStoreIds = getAllowedStoreIds(req.user);
        const normalizedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
        const normalizedSortBy = ['momentum', 'quantity'].includes(sort_by) ? sort_by : 'momentum';

        if (allowedStoreIds !== null && allowedStoreIds.length === 0) {
            return res.json({
                code: 200,
                message: 'Success',
                data: {
                    products: [],
                    sortBy: normalizedSortBy,
                    limit: normalizedLimit,
                    labelsSummary: {
                        SKYROCKETING: 0,
                        RISING: 0,
                        STABLE: 0,
                        COOLING: 0
                    }
                }
            });
        }

        const momentumWhere = {};
        if (store_id) {
            momentumWhere.store_id = parseInt(store_id, 10);
        } else if (allowedStoreIds !== null) {
            momentumWhere.store_id = { [Op.in]: allowedStoreIds };
        }

        const latestMomentumAt = await MomentumReport.max('calculated_at', { where: momentumWhere });
        const cacheKey = hashQueryKey('analytics:best-sellers:v5', {
            store_id,
            limit: normalizedLimit,
            sort_by: normalizedSortBy,
            allowedStoreIds,
            latestMomentumAt
        });
        const cached = await redisGet(cacheKey);
        if (cached) {
            return res.json({ code: 200, message: 'Success (cached)', data: JSON.parse(cached) });
        }

        const orderBy = normalizedSortBy === 'quantity'
            ? [['current_qty', 'DESC'], ['momentum_score', 'DESC']]
            : [['momentum_score', 'DESC'], ['current_qty', 'DESC']];

        const momentumRows = await MomentumReport.findAll({
            where: momentumWhere,
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'title', 'thumbnail'],
                    where: { deleted_at: null },
                    required: true
                },
                {
                    model: Store,
                    as: 'store',
                    attributes: ['id', 'code', 'name'],
                    required: false
                }
            ],
            order: orderBy,
            limit: normalizedLimit
        });

        const labelsSummary = {
            SKYROCKETING: 0,
            RISING: 0,
            STABLE: 0,
            COOLING: 0
        };

        const products = momentumRows.map(row => {
            const label = row.label || 'STABLE';
            if (labelsSummary[label] !== undefined) {
                labelsSummary[label] += 1;
            }

            return {
                productId: row.product_id,
                title: row.product?.title || '',
                thumbnail: row.product?.thumbnail || null,
                storeId: row.store_id,
                storeCode: row.store?.code || null,
                storeName: row.store?.name || null,
                currentQty: parseInt(row.current_qty, 10) || 0,
                prevQty: parseInt(row.prev_qty, 10) || 0,
                momentumScore: parseFloat(row.momentum_score) || 0,
                label,
                calculatedAt: row.calculated_at
            };
        });

        const data = {
            sortBy: normalizedSortBy,
            limit: normalizedLimit,
            labelsSummary,
            products
        };

        await redisSet(cacheKey, JSON.stringify(data), 1800);

        res.json({ code: 200, message: 'Success', data });
    } catch (error) {
        console.error('Best Sellers Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error', error: error.message });
    }
};

// [GET] /api/v1/admin/analytics/dead-stock
export const getDeadStock = async (req, res) => {
    try {
        const { store_id, days = 30 } = req.query;
        const allowedStoreIds = getAllowedStoreIds(req.user);
        const normalizedDays = Math.max(parseInt(days, 10) || 30, 0);

        if (allowedStoreIds !== null && allowedStoreIds.length === 0) {
            return res.json({ code: 200, message: 'Success', data: { items: [] } });
        }

        const snapshotWhere = {};
        if (store_id) {
            snapshotWhere.store_id = parseInt(store_id, 10);
        } else if (allowedStoreIds !== null) {
            snapshotWhere.store_id = { [Op.in]: allowedStoreIds };
        }

        // Include latest snapshot timestamp in cache key so cache is invalidated after each DSI upsert.
        const latestSnapshotAt = await DsiReport.max('calculated_at', { where: snapshotWhere });
        const cacheKey = hashQueryKey('analytics:dead-stock:v6', {
            store_id,
            days: normalizedDays,
            allowedStoreIds,
            latestSnapshotAt
        });
        const cached = await redisGet(cacheKey);
        if (cached) {
            return res.json({ code: 200, message: 'Success (cached)', data: JSON.parse(cached) });
        }

        // Build DSI filter conditions
        const dsiWhere = {
            stock: { [Op.gt]: 0 },
            days_stale: { [Op.gte]: normalizedDays }
        };

        if (store_id) {
            dsiWhere.store_id = parseInt(store_id, 10);
        } else if (allowedStoreIds !== null) {
            dsiWhere.store_id = { [Op.in]: allowedStoreIds };
        }

        // Query using Sequelize ORM for main data
        const dsiReports = await DsiReport.findAll({
            where: dsiWhere,
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'title', 'thumbnail', 'price']
                },
                {
                    model: Store,
                    as: 'store',
                    attributes: ['id', 'name', 'code']
                }
            ],
            order: [['dsi_score', 'DESC']],
            limit: 50
        });

        // If no results yet, generate snapshot then re-query
        if (dsiReports.length === 0) {
            await calculateAndSaveDSI({
                storeId: store_id || null,
                allowedStoreIds
            });
            const retried = await DsiReport.findAll({
                where: dsiWhere,
                include: [
                    { model: Product, as: 'product', attributes: ['id', 'title', 'thumbnail', 'price'] },
                    { model: Store, as: 'store', attributes: ['id', 'name', 'code'] }
                ],
                order: [['dsi_score', 'DESC']],
                limit: 50
            });
            if (retried.length === 0) {
                return res.json({ code: 200, message: 'Success', data: { items: [] } });
            }
            dsiReports.push(...retried);
        }

        // Get last sold dates for these product-store combinations
        const productStoreKeys = dsiReports.map(r => ({
            product_id: r.product_id,
            store_id: r.store_id
        }));

        let lastSoldMap = new Map();
        if (productStoreKeys.length > 0) {
            // Use raw query for complex aggregation (last_sold_date calculation)
            const lastSoldResults = await sequelize.query(`
                SELECT 
                    oi.product_id,
                    o.store_id,
                    MAX(o.created_at) AS last_sold_date
                FROM order_items oi
                INNER JOIN orders o ON o.id = oi.order_id
                WHERE oi.product_id IN (:productIds)
                  AND o.store_id IN (:storeIds)
                  AND o.deleted_at IS NULL
                                    AND o.status = 'delivered'
                                    AND o.payment_status = 'paid'
                GROUP BY oi.product_id, o.store_id
            `, {
                replacements: {
                    productIds: [...new Set(productStoreKeys.map(k => k.product_id))],
                    storeIds: [...new Set(productStoreKeys.map(k => k.store_id))]
                },
                type: QueryTypes.SELECT
            });

            lastSoldMap = new Map(
                lastSoldResults.map(r => [`${r.product_id}_${r.store_id}`, r.last_sold_date])
            );
        }

        // Map results (parseFloat for DECIMAL fields — Sequelize returns them as strings)
        const data = {
            items: dsiReports.map(r => ({
                productId: r.product_id,
                title: r.product?.title ?? '',
                thumbnail: r.product?.thumbnail ?? null,
                storeId: r.store_id,
                storeName: r.store?.name ?? '',
                storeCode: r.store?.code ?? '',
                stock: parseInt(r.stock, 10) || 0,
                price: parseFloat(r.product?.price) || 0,
                stockValue: parseFloat(r.capital_tied_up) || 0,
                lastSoldDate: lastSoldMap.get(`${r.product_id}_${r.store_id}`) || null,
                daysSinceLastSold: parseInt(r.days_stale, 10) || 0,
                velocity: parseInt(r.velocity, 10) || 0,
                dsiScore: parseFloat(r.dsi_score) || 0,
                riskLevel: r.risk_level,
                calculatedAt: r.calculated_at
            }))
        };

        await redisSet(cacheKey, JSON.stringify(data), 3600);

        res.json({ code: 200, message: 'Success', data });
    } catch (error) {
        console.error('Dead Stock Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error', error: error.message });
    }
};
