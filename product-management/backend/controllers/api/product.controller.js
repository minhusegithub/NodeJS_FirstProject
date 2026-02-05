import { Product, ProductCategory, ProductStoreInventory, Store } from '../../models/sequelize/index.js';
import { Op } from 'sequelize';

// [GET] /api/products
export const getProducts = async (req, res) => {
    try {
        const { page = 1, limit = 12, keyword, category_id, status, featured, price_range } = req.query;
        const offset = (page - 1) * limit;

        const where = {};

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
                where.price = { [Op.lt]: 100 };
            } else if (price_range === '100_to_500') {
                where.price = { [Op.between]: [100, 500] };
            } else if (price_range === 'over_500') {
                where.price = { [Op.gt]: 500 };
            }
        }

        // Default to active products only (unless explicitly specified)
        if (status) {
            where.status = status;
        } else {
            where.status = 'active'; // Only show active products by default
        }

        if (featured !== undefined) {
            where.featured = featured === 'true';
        }

        const { count, rows } = await Product.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['position', 'ASC'], ['created_at', 'DESC']],
            include: [
                {
                    model: ProductCategory,
                    as: 'category',
                    attributes: ['id', 'title', 'slug']
                },
                {
                    model: ProductStoreInventory,
                    as: 'inventory',
                    include: [
                        {
                            model: Store,
                            as: 'store',
                            attributes: ['id', 'code', 'name']
                        }
                    ]
                }
            ],
            distinct: true
        });

        res.json({
            code: 200,
            message: "Success",
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
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

// [POST] /api/products
export const createProduct = async (req, res) => {
    try {
        const {
            sku,
            title,
            product_category_id,
            description,
            price,
            discount_percentage,
            brand,
            weight,
            dimensions,
            thumbnail,
            status,
            featured,
            position
        } = req.body;

        // Validation
        if (!title || price === undefined) {
            return res.status(400).json({
                code: 400,
                message: "Title and Price are required"
            });
        }

        // Check duplicate SKU if provided
        if (sku) {
            const existingProduct = await Product.findOne({ where: { sku } });
            if (existingProduct) {
                return res.status(400).json({
                    code: 400,
                    message: `Product with SKU "${sku}" already exists`
                });
            }
        }

        const newProduct = await Product.create({
            sku,
            title,
            product_category_id: product_category_id || null,
            description,
            price,
            discount_percentage: discount_percentage || 0,
            brand,
            weight,
            dimensions, // Expected: {length, width, height}
            thumbnail,
            status: status || 'active',
            featured: featured || false,
            position: position || 0,
            is_variant_parent: false
        });

        // Fetch with relations
        const productWithRelations = await Product.findByPk(newProduct.id, {
            include: [
                {
                    model: ProductCategory,
                    as: 'category',
                    attributes: ['id', 'title', 'slug']
                }
            ]
        });

        res.status(201).json({
            code: 201,
            message: "Product created successfully",
            data: productWithRelations
        });
    } catch (error) {
        console.error('Create Product Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// [PUT] /api/products/:id
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({
                code: 404,
                message: "Product not found"
            });
        }

        // Check duplicate SKU if updating
        if (updates.sku && updates.sku !== product.sku) {
            const existing = await Product.findOne({ where: { sku: updates.sku } });
            if (existing) {
                return res.status(400).json({
                    code: 400,
                    message: `Product with SKU "${updates.sku}" already exists`
                });
            }
        }

        await product.update(updates);

        // Fetch updated product with relations
        const updatedProduct = await Product.findByPk(id, {
            include: [
                {
                    model: ProductCategory,
                    as: 'category',
                    attributes: ['id', 'title', 'slug']
                },
                {
                    model: ProductStoreInventory,
                    as: 'inventory',
                    include: [
                        {
                            model: Store,
                            as: 'store',
                            attributes: ['id', 'code', 'name']
                        }
                    ]
                }
            ]
        });

        res.json({
            code: 200,
            message: "Product updated successfully",
            data: updatedProduct
        });
    } catch (error) {
        console.error('Update Product Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// [DELETE] /api/products/:id
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({
                code: 404,
                message: "Product not found"
            });
        }

        // Soft delete (paranoid: true in model)
        await product.destroy();

        res.json({
            code: 200,
            message: "Product deleted successfully"
        });
    } catch (error) {
        console.error('Delete Product Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// [POST] /api/products/:id/inventory
// Add/Update inventory for a product at a specific store
export const updateProductInventory = async (req, res) => {
    try {
        const { id: product_id } = req.params;
        const { store_id, stock, min_stock, max_stock, store_price, location } = req.body;

        if (!store_id) {
            return res.status(400).json({
                code: 400,
                message: "store_id is required"
            });
        }

        // Check if product exists
        const product = await Product.findByPk(product_id);
        if (!product) {
            return res.status(404).json({
                code: 404,
                message: "Product not found"
            });
        }

        // Check if store exists
        const store = await Store.findByPk(store_id);
        if (!store) {
            return res.status(404).json({
                code: 404,
                message: "Store not found"
            });
        }

        // Find or create inventory record
        const [inventory, created] = await ProductStoreInventory.findOrCreate({
            where: { product_id, store_id },
            defaults: {
                stock: stock || 0,
                min_stock: min_stock || 0,
                max_stock,
                store_price,
                location,
                last_restock_date: new Date()
            }
        });

        if (!created) {
            // Update existing inventory
            await inventory.update({
                ...(stock !== undefined && { stock }),
                ...(min_stock !== undefined && { min_stock }),
                ...(max_stock !== undefined && { max_stock }),
                ...(store_price !== undefined && { store_price }),
                ...(location !== undefined && { location }),
                last_restock_date: new Date()
            });
        }

        res.json({
            code: created ? 201 : 200,
            message: created ? "Inventory created successfully" : "Inventory updated successfully",
            data: inventory
        });
    } catch (error) {
        console.error('Update Product Inventory Error:', error);
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
        // Get all active categories
        const categories = await ProductCategory.findAll({
            where: { status: 'active' },
            order: [['position', 'ASC'], ['title', 'ASC']],
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
