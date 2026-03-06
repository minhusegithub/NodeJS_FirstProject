import { Product, ProductCategory, ProductStoreInventory, Store, sequelize } from '../../../models/sequelize/index.js';
import { Op } from 'sequelize';
import { redisDel } from '../../../config/redis.js';

// [GET] /api/v1/admin/products
export const index = async (req, res) => {
    try {
        const { page = 1, limit = 10, keyword = '', status } = req.query;
        const offset = (page - 1) * limit;

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
            if (status) where.status = status;

            result = await Product.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['id', 'DESC']],
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
                        attributes: [['stock', 'quantity'], 'store_id'],
                        required: false,
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
                    data: { products: [], pagination: { total: 0, currentPage: 1, totalPages: 0, limit: parseInt(limit) } }
                });
            }

            // Build Where Clause for Product Store Inventory (Filter by Store)
            const inventoryWhere = {
                store_id: { [Op.in]: storeIds }
            };

            // Build Where Clause for Associated Product (Filter by Keyword/Status)
            const productWhere = {
                deleted_at: null
            };
            if (status) productWhere.status = status;
            if (keyword) productWhere.title = { [Op.iLike]: `%${keyword}%` };

            result = await ProductStoreInventory.findAndCountAll({
                where: inventoryWhere,
                limit: parseInt(limit),
                offset: parseInt(offset),
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
                distinct: true
            });

            // Transform
            productsData = result.rows.map(inv => {
                const p = inv.product ? inv.product.toJSON() : {};
                return {
                    ...p,
                    inventory: [{
                        quantity: inv.stock,
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
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(result.count / limit),
                    limit: parseInt(limit)
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
        const { title, description, price, discount_percentage, stock, status, category_id, sku, brand } = req.body;

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
                stock: parseInt(stock) || 0,
                thumbnail, // Ensure this is saved
                status,
                product_category_id: category_id || null,
                sku: sku || null,
                brand
            });

        } else {
            // Store Manager: Update ONLY inventory for their store
            const storeIds = req.user.store_roles?.map(r => r.store_id).filter(Boolean) || [];

            // Find or Create inventory record
            if (storeIds.length > 0) {
                let inventory = await ProductStoreInventory.findOne({
                    where: {
                        product_id: id,
                        store_id: { [Op.in]: storeIds }
                    }
                });

                if (inventory) {
                    await inventory.update({ stock: parseInt(stock) || 0 });
                } else {
                    await ProductStoreInventory.create({
                        product_id: id,
                        store_id: storeIds[0], // Default to first store
                        stock: parseInt(stock) || 0
                    });
                }
            } else {
                return res.status(403).json({ success: false, message: 'Bạn không quản lý cửa hàng nào để cập nhật kho' });
            }
        }

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
        const { title, description, price, discount_percentage, stock, status, category_id, sku, brand } = req.body;

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
            stock: parseInt(stock) || 0,
            thumbnail,
            status: status || 'active',
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
            deleted_at: null,
            status: 'active'
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

        // 2. Check stock
        if (product.stock < importQty) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: `Kho chính không đủ hàng. Chỉ còn ${product.stock} sản phẩm.`
            });
        }

        // 3. Deduct from Main Warehouse
        await product.decrement('stock', { by: importQty, transaction: t });

        // 4. Add to Store Warehouse
        // Check if inventory exists
        let inventory = await ProductStoreInventory.findOne({
            where: { product_id, store_id: storeId },
            transaction: t
        });

        if (inventory) {
            await inventory.increment('stock', { by: importQty, transaction: t });
        } else {
            await ProductStoreInventory.create({
                product_id,
                store_id: storeId,
                stock: importQty
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
