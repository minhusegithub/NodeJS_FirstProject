import {
    Store,
    StoreRevenueStat,
    ProductStoreInventory,
    Product,
    sequelize
} from '../../../models/sequelize/index.js';
import { Op, QueryTypes } from 'sequelize';
import { redisGet, redisSet } from '../../../config/redis.js';
import { hashQueryKey } from '../../../helpers/cacheKey.js';

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

        // Cache check
        const cacheKey = hashQueryKey('analytics:revenue:v2', { from, to, store_id, allowedStoreIds });
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
            where.store_id = store_id;
        } else if (allowedStoreIds !== null) {
            where.store_id = { [Op.in]: allowedStoreIds };
        }

        // Summary aggregation
        const summaryResult = await StoreRevenueStat.findOne({
            where,
            attributes: [
                [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_revenue')), 0), 'totalRevenue'],
                [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_orders')), 0), 'totalOrders'],
                [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('unique_customers')), 0), 'uniqueCustomers'],
                [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_items_sold')), 0), 'totalItemsSold']
            ],
            raw: true
        });

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
// Top selling products per store
export const getBestSellers = async (req, res) => {
    try {
        const { store_id, from, to, limit = 10, sort_by = 'quantity' } = req.query;
        const allowedStoreIds = getAllowedStoreIds(req.user);
        const normalizedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

        if (allowedStoreIds !== null && allowedStoreIds.length === 0) {
            return res.json({ code: 200, message: 'Success', data: { products: [], sortBy: sort_by, limit: normalizedLimit } });
        }

        const cacheKey = hashQueryKey('analytics:best-sellers:v4', { store_id, from, to, limit: normalizedLimit, sort_by, allowedStoreIds });
        const cached = await redisGet(cacheKey);
        if (cached) {
            return res.json({ code: 200, message: 'Success (cached)', data: JSON.parse(cached) });
        }

        const endDate = to || new Date().toISOString().split('T')[0];
        const startDate = from || (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })();

        // Build store filter
        let storeFilter = '';
        const replacements = { startDate, endDate, limit: normalizedLimit };

        if (store_id) {
            storeFilter = 'AND o.store_id = :storeId';
            replacements.storeId = parseInt(store_id);
        } else if (allowedStoreIds !== null) {
            storeFilter = 'AND o.store_id IN (:allowedStoreIds)';
            replacements.allowedStoreIds = allowedStoreIds;
        }

        // Determine sort field based on sort_by parameter
        const sortField = sort_by === 'revenue' ? 'revenue' : '"totalSold"';

        const results = await sequelize.query(`
            SELECT 
                oi.product_id AS "productId",
                p.title,
                SUM(oi.quantity) AS "totalSold",
                SUM(oi.total_price) AS revenue
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            INNER JOIN products p ON oi.product_id = p.id
            WHERE o.status = 'delivered'
              AND o.payment_status = 'paid'
              AND o.deleted_at IS NULL
              AND p.deleted_at IS NULL
                            AND o.created_at >= :startDate::date
                            AND o.created_at < (:endDate::date + INTERVAL '1 day')
              ${storeFilter}
            GROUP BY oi.product_id, p.title
            ORDER BY ${sortField} DESC
            LIMIT :limit
        `, {
            replacements,
            type: QueryTypes.SELECT
        });

        const data = {
            sortBy: sort_by,
            limit: normalizedLimit,
            products: results.map(r => ({
                productId: r.productId,
                title: r.title,
                totalSold: parseInt(r.totalSold) || 0,
                revenue: parseFloat(r.revenue) || 0
            }))
        };

        await redisSet(cacheKey, JSON.stringify(data), 1800);

        res.json({ code: 200, message: 'Success', data });
    } catch (error) {
        console.error('Best Sellers Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error', error: error.message });
    }
};

// [GET] /api/v1/admin/analytics/dead-stock
// Products with stock > 0 but no sales in N days
export const getDeadStock = async (req, res) => {
    try {
        const { store_id, days = 30 } = req.query;
        const allowedStoreIds = getAllowedStoreIds(req.user);

        if (allowedStoreIds !== null && allowedStoreIds.length === 0) {
            return res.json({ code: 200, message: 'Success', data: { items: [] } });
        }

        const cacheKey = hashQueryKey('analytics:dead-stock:v2', { store_id, days, allowedStoreIds });
        const cached = await redisGet(cacheKey);
        if (cached) {
            return res.json({ code: 200, message: 'Success (cached)', data: JSON.parse(cached) });
        }

        // Build store filter
        let storeFilter = '';
        const replacements = { days: parseInt(days) };

        if (store_id) {
            storeFilter = 'AND psi.store_id = :storeId';
            replacements.storeId = parseInt(store_id);
        } else if (allowedStoreIds !== null) {
            storeFilter = 'AND psi.store_id IN (:allowedStoreIds)';
            replacements.allowedStoreIds = allowedStoreIds;
        }

        const results = await sequelize.query(`
            SELECT 
                p.id AS "productId",
                p.title,
                p.thumbnail,
                psi.store_id AS "storeId",
                s.name AS "storeName",
                s.code AS "storeCode",
                psi.stock,
                COALESCE(psi.store_price, p.price) AS price,
                psi.stock * COALESCE(psi.store_price, p.price) AS "stockValue",
                last_sale.last_sold_date AS "lastSoldDate",
                CASE 
                    WHEN last_sale.last_sold_date IS NULL THEN 9999
                    ELSE EXTRACT(DAY FROM NOW() - last_sale.last_sold_date)::INT
                END AS "daysSinceLastSold"
            FROM product_store_inventory psi
            INNER JOIN products p ON p.id = psi.product_id AND p.deleted_at IS NULL
            INNER JOIN stores s ON s.id = psi.store_id AND s.is_active = true
            LEFT JOIN LATERAL (
                SELECT MAX(o.created_at) AS last_sold_date
                FROM order_items oi
                INNER JOIN orders o ON o.id = oi.order_id
                WHERE oi.product_id = psi.product_id
                  AND o.store_id = psi.store_id
                  AND o.status = 'delivered'
                  AND o.deleted_at IS NULL
            ) last_sale ON true
            WHERE psi.stock > 0
              ${storeFilter}
              AND (
                  last_sale.last_sold_date IS NULL 
                  OR last_sale.last_sold_date < NOW() - INTERVAL '1 day' * :days
              )
            ORDER BY "stockValue" DESC
            LIMIT 50
        `, {
            replacements,
            type: QueryTypes.SELECT
        });

        const data = {
            items: results.map(r => ({
                productId: r.productId,
                title: r.title,
                thumbnail: r.thumbnail,
                storeId: r.storeId,
                storeName: r.storeName,
                storeCode: r.storeCode,
                stock: parseInt(r.stock) || 0,
                price: parseFloat(r.price) || 0,
                stockValue: parseFloat(r.stockValue) || 0,
                lastSoldDate: r.lastSoldDate || null,
                daysSinceLastSold: parseInt(r.daysSinceLastSold) || 9999
            }))
        };

        await redisSet(cacheKey, JSON.stringify(data), 3600); // 1 hour TTL

        res.json({ code: 200, message: 'Success', data });
    } catch (error) {
        console.error('Dead Stock Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error', error: error.message });
    }
};
