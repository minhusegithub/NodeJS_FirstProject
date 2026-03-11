import { Product, ProductCategory, ProductStoreInventory, Store, sequelize } from '../../../models/sequelize/index.js';
import { Op } from 'sequelize';
import { redisDel } from '../../../config/redis.js';

// [GET] /api/v1/admin/products
export const index = async (req, res) => {
    try {
        const { page = 1, limit = 10, keyword = '', status, stock_threshold, stockThreshold } = req.query;
        const parsedPage = parseInt(page, 10) || 1;
        const parsedLimit = parseInt(limit, 10) || 10;
        const offset = (parsedPage - 1) * parsedLimit;
        const stockThresholdValue = parseInt(stock_threshold ?? stockThreshold, 10);
        const hasStockThreshold = Number.isInteger(stockThresholdValue) && stockThresholdValue > 0;

        // Check Roles
        const systemAdminRole = req.user.store_roles?.find(
            r => r.role_data?.name === 'SystemAdmin' || r.role_data?.scope === 'system'
        );

        let result = { count: 0, rows: [] };
        let productsData = [];



        if (systemAdminRole) {
            // --- CASE 1: SYSTEM ADMIN ---
            const where = { deleted_at: null };
            if (keyword) where.title = { [Op.iLike]: `%${keyword}%` };
            if (hasStockThreshold) where.stock = { [Op.lt]: stockThresholdValue };

            const inventoryWhere = {};
            if (status) inventoryWhere.status = status;

            const hasInventoryFilters = Object.keys(inventoryWhere).length > 0;

            result = await Product.findAndCountAll({
                where,
                limit: parsedLimit,
                offset,
                order: hasStockThreshold
                    ? [['stock', 'ASC'], ['title', 'ASC']]
                    : [['title', 'ASC']],
                include: [
                    {
                        model: ProductCategory,
                        as: 'category',
                        attributes: ['id', 'title'],
                        required: false
                    },
                    {
                        model: ProductStoreInventory,
                        as: 'inventory',
                        attributes: [['stock', 'quantity'], 'store_id', 'status'],
                        where: hasInventoryFilters ? inventoryWhere : undefined,
                        required: hasInventoryFilters,
                        include: [
                            {
                                model: Store,
                                as: 'store',
                                attributes: ['id', 'name'],
                                required: false
                            }
                        ]
                    }
                ],
                distinct: true
            });
            productsData = result.rows;

        } else {
            // --- CASE 2: STORE MANAGER ---
            const storeIds = req.user.store_roles?.map(r => r.store_id).filter(Boolean) || [];


            if (storeIds.length === 0) {
                return res.json({
                    success: true,
                    data: { products: [], pagination: { total: 0, currentPage: 1, totalPages: 0, limit: parsedLimit } }
                });
            }

            // Build Where Clause for Product Store Inventory (Filter by Store)
            const inventoryWhere = {
                store_id: { [Op.in]: storeIds }
            };
            if (hasStockThreshold) inventoryWhere.stock = { [Op.lt]: stockThresholdValue };
            if (status) inventoryWhere.status = status;

            // Build Where Clause for Associated Product (Filter by Keyword/Status)
            const productWhere = {
                deleted_at: null
            };
            if (keyword) productWhere.title = { [Op.iLike]: `%${keyword}%` };

            result = await ProductStoreInventory.findAndCountAll({
                where: inventoryWhere,
                limit: parsedLimit,
                offset,
                include: [
                    {
                        model: Product,
                        as: 'product',
                        where: productWhere,
                        required: true, // Inner Join to ensure keyword filter works
                        include: [
                            {
                                model: ProductCategory,
                                as: 'category',
                                attributes: ['id', 'title'],
                                required: false
                            }
                        ]
                    },
                    {
                        model: Store,
                        as: 'store',
                        attributes: ['id', 'name']
                    }
                ],
                order: hasStockThreshold
                    ? [['stock', 'ASC'], [{ model: Product, as: 'product' }, 'title', 'ASC']]
                    : [[{ model: Product, as: 'product' }, 'title', 'ASC']],
                distinct: true
            });

            // Transform
            productsData = result.rows.map(inv => {
                const p = inv.product ? inv.product.toJSON() : {};
                return {
                    ...p,
                    status: inv.status,
                    inventory: [{
                        quantity: inv.stock,
                        status: inv.status,
                        store: inv.store
                    }],
                    inventory_id: inv.id
                };
            });
        }

        res.json({
            success: true,
            data: {
                products: productsData,
                pagination: {
                    total: result.count,
                    currentPage: parsedPage,
                    totalPages: Math.ceil(result.count / parsedLimit),
                    limit: parsedLimit
                }
            }
        });

    } catch (error) {
        console.error('Get Admin Products Error Details:', error); // Important: Log full error object
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + error.message
        });
    }
};

// [GET] /api/v1/admin/products/:id
export const show = async (req, res) => {
    try {
        const { id } = req.params;
        const systemAdminRole = req.user.store_roles?.find(
            r => r.role_data?.name === 'SystemAdmin' || r.role_data?.scope === 'system'
        );

        let product;

        if (systemAdminRole) {
            product = await Product.findByPk(id, {
                include: [
                    {
                        model: ProductCategory,
                        as: 'category',
                        attributes: ['id', 'title'],
                        required: false
                    }
                ]
            });
        } else {
            // Store Manager - get product with their specific store inventory
            const storeIds = req.user.store_roles?.map(r => r.store_id).filter(Boolean) || [];

            product = await Product.findByPk(id, {
                include: [
                    {
                        model: ProductCategory,
                        as: 'category',
                        attributes: ['id', 'title'],
                        required: false
                    },
                    {
                        model: ProductStoreInventory,
                        as: 'inventory',
                        required: false,
                        where: { store_id: { [Op.in]: storeIds } },
                        include: [{ model: Store, as: 'store', attributes: ['id', 'name'] }]
                    }
                ]
            });
        }

        if (!product) {
            return res.render('client/errors/404', { pageTitle: '404 Not Found' });
        }

        res.json({ success: true, data: { product } });
    } catch (error) {
        console.error('Get Product Detail Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
};

// [PUT] /api/v1/admin/products/:id
export const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, discount_percentage, stock, import_quantity, status, category_id, sku, brand } = req.body;

        const systemAdminRole = req.user.store_roles?.find(
            r => r.role_data?.name === 'SystemAdmin' || r.role_data?.scope === 'system'
        );

        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        if (systemAdminRole) {
            // System Admin: Update all fields
            let thumbnail = product.thumbnail;
            if (req.file) {
                try {
                    const uploadToCloudinary = (await import('../../../helpers/uploadToCloudinary.js')).default;
                    thumbnail = await uploadToCloudinary(req.file.buffer);
                } catch (uploadError) {
                    return res.status(500).json({ success: false, message: "Lỗi upload ảnh" });
                }
            }

            // Update product
            await product.update({
                title,
                description,
                price: parseFloat(price) || 0,
                discount_percentage: parseFloat(discount_percentage) || 0,
                stock: parseInt(stock, 10) || 0,
                thumbnail, // Ensure this is saved
                product_category_id: category_id || null,
                sku: sku || null,
                brand
            });

        } else {
            // Store Manager / InventoryStaff: import quantity from main warehouse stock
            const storeIds = req.user.store_roles?.map(r => r.store_id).filter(Boolean) || [];
            const importQty = parseInt(import_quantity ?? stock, 10);

            if (!Number.isInteger(importQty) || importQty < 0) {
                return res.status(400).json({ success: false, message: 'Số lượng muốn nhập không hợp lệ (>= 0)' });
            }

            if (importQty > (parseInt(product.stock, 10) || 0)) {
                return res.status(400).json({
                    success: false,
                    message: `Kho chính không đủ hàng. Chỉ còn ${product.stock} sản phẩm.`
                });
            }

            // Find or Create inventory record
            if (storeIds.length > 0) {
                const t = await sequelize.transaction();

                try {
                    // Lock product row to avoid concurrent over-imports.
                    const lockedProduct = await Product.findByPk(id, {
                        transaction: t,
                        lock: t.LOCK.UPDATE
                    });

                    if (!lockedProduct) {
                        await t.rollback();
                        return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
                    }

                    const mainStock = parseInt(lockedProduct.stock, 10) || 0;
                    if (importQty > mainStock) {
                        await t.rollback();
                        return res.status(400).json({
                            success: false,
                            message: `Kho chính không đủ hàng. Chỉ còn ${mainStock} sản phẩm.`
                        });
                    }

                    let inventory = await ProductStoreInventory.findOne({
                        where: {
                            product_id: id,
                            store_id: { [Op.in]: storeIds }
                        },
                        transaction: t,
                        lock: t.LOCK.UPDATE
                    });

                    if (inventory) {
                        if (importQty > 0) {
                            await inventory.increment('stock', { by: importQty, transaction: t });
                        }
                        if (status === 'inactive' || status === 'active') {
                            await inventory.update({ status }, { transaction: t });
                        } else if (importQty > 0 && inventory.status !== 'active') {
                            await inventory.update({ status: 'active' }, { transaction: t });
                        }
                    } else {
                        await ProductStoreInventory.create({
                            product_id: id,
                            store_id: storeIds[0], // Default to first store
                            stock: importQty,
                            status: status === 'inactive' ? 'inactive' : 'active'
                        }, { transaction: t });
                    }

                    if (importQty > 0) {
                        await lockedProduct.decrement('stock', { by: importQty, transaction: t });
                    }
                    await t.commit();
                } catch (txnError) {
                    await t.rollback();
                    throw txnError;
                }
            } else {
                return res.status(403).json({ success: false, message: 'Bạn không quản lý cửa hàng nào để cập nhật kho' });
            }
        }

        await product.reload();

        // Invalidate cache
        if (product.slug) {
            await redisDel(`product:detail:${product.slug}`);
        }
        await redisDel(`product:detail:${id}`);

        // Return updated product data to fix frontend double toast error
        res.json({
            success: true,
            message: 'Cập nhật sản phẩm thành công',
            data: { product }
        });

    } catch (error) {
        console.error('Update Product Error:', error);
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const messages = error.errors.map(e => e.message).join(', ');
            return res.status(400).json({ success: false, message: messages });
        }
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
};


// [POST] /api/v1/admin/products/create
export const create = async (req, res) => {
    try {
        const { title, description, price, discount_percentage, stock, category_id, sku, brand } = req.body;

        let thumbnail = "";

        if (req.file) {
            // Upload buffer to Cloudinary (requires multer memoryStorage)
            try {
                const uploadToCloudinary = (await import('../../../helpers/uploadToCloudinary.js')).default;
                thumbnail = await uploadToCloudinary(req.file.buffer);
            } catch (uploadError) {
                console.error("Cloudinary Upload Error:", uploadError);
                return res.status(500).json({ success: false, message: "Lỗi upload ảnh lên Cloudinary" });
            }
        }

        const newProduct = await Product.create({
            title,
            description,
            price: parseFloat(price) || 0,
            discount_percentage: parseFloat(discount_percentage) || 0,
            stock: parseInt(stock, 10) || 0,
            thumbnail,
            product_category_id: category_id || null,
            sku: sku || null, // Convert empty string to null to avoid unique constraint violation
            brand
        });

        res.status(201).json({
            success: true,
            message: "Tạo sản phẩm thành công",
            data: { product: newProduct }
        });

    } catch (error) {
        console.error("Create Product Error:", error);

        // Handle Sequelize Validation Errors specifically
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const messages = error.errors.map(e => e.message).join(', ');
            return res.status(400).json({
                success: false,
                message: messages
            });
        }

        res.status(500).json({
            success: false,
            message: "Lỗi server: " + error.message
        });
    }
};

// [GET] /api/v1/admin/products/available-for-import
export const getProductsAvailableForImport = async (req, res) => {
    try {
        const { page = 1, limit = 10, keyword = '' } = req.query;
        const offset = (page - 1) * limit;

        // Get user's store
        const storeIds = req.user.store_roles?.map(r => r.store_id).filter(Boolean) || [];

        if (storeIds.length === 0) {
            return res.json({
                success: true,
                data: { products: [], pagination: { total: 0, currentPage: 1, totalPages: 0, limit: parseInt(limit) } }
            });
        }

        const storeId = storeIds[0];

        const where = {
            deleted_at: null
        };

        if (keyword) {
            // Search by title OR SKU
            where[Op.or] = [
                { title: { [Op.iLike]: `%${keyword}%` } },
                { sku: { [Op.iLike]: `%${keyword}%` } }
            ];
        }

        // Use literal subquery to find products NOT in store inventory
        const result = await Product.findAndCountAll({
            where: {
                ...where,
                id: {
                    [Op.notIn]: sequelize.literal(`(SELECT product_id FROM product_store_inventory WHERE store_id = ${storeId})`)
                }
            },
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: ProductCategory,
                    as: 'category',
                    attributes: ['id', 'title'],
                    required: false
                }
            ]
        });

        res.json({
            success: true,
            data: {
                products: result.rows,
                pagination: {
                    total: result.count,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(result.count / limit),
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get Available Import Products Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + error.message
        });
    }
};

// [POST] /api/v1/admin/products/import
export const importProduct = async (req, res) => {
    let t;
    try {
        t = await sequelize.transaction();
        const { product_id, quantity } = req.body;
        const importQty = parseInt(quantity);

        if (isNaN(importQty) || importQty <= 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Số lượng nhập phải lớn hơn 0" });
        }

        const storeIds = req.user.store_roles?.map(r => r.store_id).filter(Boolean) || [];
        if (storeIds.length === 0) {
            await t.rollback();
            return res.status(403).json({ success: false, message: "Bạn không có quyền quản lý cửa hàng nào" });
        }
        const storeId = storeIds[0];

        // 1. Get Product and Lock it
        const product = await Product.findByPk(product_id, { transaction: t, lock: true });
        if (!product) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Sản phẩm không tồn tại" });
        }

        // Check stock at main warehouse
        if (product.stock < importQty) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: `Kho chính không đủ hàng. Chỉ còn ${product.stock} sản phẩm.`
            });
        }

        // Deduct from main warehouse
        await product.decrement('stock', { by: importQty, transaction: t });

        // Add to Store Warehouse
        // Check if inventory exists
        let inventory = await ProductStoreInventory.findOne({
            where: { product_id, store_id: storeId },
            transaction: t
        });

        if (inventory) {
            await inventory.increment('stock', { by: importQty, transaction: t });
            if (inventory.status !== 'active') {
                await inventory.update({ status: 'active' }, { transaction: t });
            }
        } else {
            await ProductStoreInventory.create({
                product_id,
                store_id: storeId,
                stock: importQty,
                status: 'active'
            }, { transaction: t });
        }

        await t.commit();

        // Reload product to get updated stock
        await product.reload();

        res.json({
            success: true,
            message: `Đã nhập ${importQty} sản phẩm về cửa hàng thành công`,
            data: { product }
        });

    } catch (error) {
        if (t) await t.rollback();
        console.error('Import Product Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + error.message
        });
    }
};
