import { Product, ProductCategory, ProductStoreInventory, Store } from '../../models/sequelize/index.js';
import { Op } from 'sequelize';
import { isRedisReady, redisGet, redisSet, redisDel } from '../../config/redis.js';
import { hashQueryKey } from '../../helpers/cacheKey.js';

// [GET] /api/products
export const getProducts = async (req, res) => {
    try {
        const { page = 1, limit = 12, keyword, category_id, status, featured, price_range } = req.query;
        
        // 1. Tạo cache key từ query params
        const cacheKey = hashQueryKey('products:list', { 
            page, limit, keyword, category_id, status, featured, price_range 
        });

        // 2. Thử lấy từ cache
        if (isRedisReady()) {
            const cached = await redisGet(cacheKey);
            if (cached) {
                
                const parsed = JSON.parse(cached);
                return res.json({
                    code: 200,
                    message: "Success (cached)",
                    data: parsed.data,
                    pagination: parsed.pagination
                });
            }
        }

        // 3. Cache miss → query DB
        const offset = (page - 1) * limit;
        const where = {};
        const inventoryWhere = {
            status: status || 'active'
        };

        if (keyword) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${keyword}%` } },
                { brand: { [Op.iLike]: `%${keyword}%` } }
            ];
        }

        if (category_id) {
            // Get all subcategories recursively
            const getSubCategoryIds = async (rootId) => {
                const subIds = [parseInt(rootId)];
                const children = await ProductCategory.findAll({
                    where: { parent_id: rootId, status: 'active' },
                    attributes: ['id']
                });

                for (const child of children) {
                    const childIds = await getSubCategoryIds(child.id);
                    subIds.push(...childIds);
                }
                return subIds;
            };

            const allCategoryIds = await getSubCategoryIds(category_id);
            where.product_category_id = { [Op.in]: allCategoryIds };
        }

        // Price range filter
        if (price_range) {
            if (price_range === 'under_100') {
                where.price = { [Op.lt]: 100000 };
            } else if (price_range === '100_to_500') {
                where.price = { [Op.between]: [100000, 500000] };
            } else if (price_range === 'over_500') {
                where.price = { [Op.gt]: 500000 };
            }
        }

        if (featured !== undefined) {
            where.featured = featured === 'true';
        }

        const { count, rows } = await Product.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: ProductCategory,
                    as: 'category',
                    attributes: ['id', 'title', 'slug']
                },
                {
                    model: ProductStoreInventory,
                    as: 'inventory',
                    where: inventoryWhere,
                    required: true,
                    include: [
                        {
                            model: Store,
                            as: 'store',
                            attributes: ['id', 'code', 'name', 'address', 'contact']
                        }
                    ]
                }
            ],
            distinct: true
        });

        const pagination = {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
        };

        // 4. Lưu vào cache (TTL 5 phút)
        const cacheData = { data: rows, pagination };
        await redisSet(cacheKey, JSON.stringify(cacheData), 300);

        res.json({
            code: 200,
            message: "Success",
            data: rows,
            pagination
        });
    } catch (error) {
        console.error('Get Products Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// [GET] /api/products/:slug
export const getProductDetail = async (req, res) => {
    try {
        const { id } = req.params; // Can be slug or id
        const cacheKey = `product:detail:${id}`;

        // 1. Thử cache trước
        if (isRedisReady()) {
            const cached = await redisGet(cacheKey);
            if (cached) {
                return res.json({
                    code: 200,
                    message: "Success (cached)",
                    data: JSON.parse(cached)
                });
            }
        }

        // 2. Cache miss → query DB
        // Try to find by slug first, then by id
        let product = await Product.findOne({
            where: { slug: id },
            include: [
                {
                    model: ProductCategory,
                    as: 'category',
                    attributes: ['id', 'title', 'slug']
                },
                {
                    model: ProductStoreInventory,
                    as: 'inventory',
                    where: { status: 'active' },
                    required: false,
                    include: [
                        {
                            model: Store,
                            as: 'store',
                            attributes: ['id', 'code', 'name', 'address', 'contact']
                        }
                    ]
                }
            ]
        });

        // If not found by slug, try by id (for backward compatibility)
        if (!product && !isNaN(id)) {
            product = await Product.findByPk(id, {
                include: [
                    {
                        model: ProductCategory,
                        as: 'category',
                        attributes: ['id', 'title', 'slug']
                    },
                    {
                        model: ProductStoreInventory,
                        as: 'inventory',
                        where: { status: 'active' },
                        required: false,
                        include: [
                            {
                                model: Store,
                                as: 'store',
                                attributes: ['id', 'code', 'name', 'address', 'contact']
                            }
                        ]
                    }
                ]
            });
        }

        if (!product) {
            return res.status(404).json({
                code: 404,
                message: "Product not found"
            });
        }

        // 3. Lưu vào cache (TTL 10 phút)
        await redisSet(cacheKey, JSON.stringify(product), 600);

        res.json({
            code: 200,
            message: "Success",
            data: product
        });
    } catch (error) {
        console.error('Get Product Detail Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};



// [GET] /api/products/categories/tree
export const getCategoryTree = async (req, res) => {
    try {
        const cacheKey = 'categories:tree';

        // 1. Thử cache trước
        if (isRedisReady()) {
            const cached = await redisGet(cacheKey);
            if (cached) {
                return res.json({
                    code: 200,
                    message: "Success (cached)",
                    data: JSON.parse(cached)
                });
            }
        }

        // 2. Cache miss → query DB
        const categories = await ProductCategory.findAll({
            where: { status: 'active' },
            order: [['title', 'ASC']],
            attributes: ['id', 'title', 'slug', 'parent_id', 'thumbnail']
        });

        // Build tree structure
        const buildTree = (parentId = null) => {
            return categories
                .filter(cat => cat.parent_id === parentId)
                .map(cat => ({
                    id: cat.id,
                    title: cat.title,
                    slug: cat.slug,
                    thumbnail: cat.thumbnail,
                    children: buildTree(cat.id)
                }));
        };

        const tree = buildTree(null);

        // 3. Lưu vào cache (TTL 1 giờ)
        await redisSet(cacheKey, JSON.stringify(tree), 3600);

        res.json({
            code: 200,
            message: "Success",
            data: tree
        });
    } catch (error) {
        console.error('Get Category Tree Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};
