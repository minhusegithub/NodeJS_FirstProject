import { Product, ProductCategory, ProductStoreInventory, Store } from '../../../models/sequelize/index.js';
import { Op } from 'sequelize';

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

// [POST] /api/v1/admin/products/create
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
