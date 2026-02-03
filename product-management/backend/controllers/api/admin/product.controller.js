import Product from '../../../models/product.model.js';
import ProductCategory from '../../../models/product-category.model.js';

// [GET] /api/v1/admin/products
export const index = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            keyword = '',
            status = '',
            category = '',
            sortKey = 'position',
            sortValue = 'desc'
        } = req.query;

        const find = { deleted: false };

        // Search
        if (keyword) {
            const regex = new RegExp(keyword, 'i');
            find.title = regex;
        }

        // Filter by status
        if (status) {
            find.status = status;
        }

        // Filter by category
        if (category) {
            find.product_category_id = category;
        }

        // Sorting
        const sort = {};
        sort[sortKey] = sortValue === 'asc' ? 1 : -1;

        // Pagination
        const skip = (page - 1) * limit;
        const total = await Product.countDocuments(find);
        const totalPages = Math.ceil(total / limit);

        const products = await Product
            .find(find)
            .sort(sort)
            .limit(parseInt(limit))
            .skip(skip);

        res.json({
            success: true,
            data: {
                products,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    limit: parseInt(limit),
                    total
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// [GET] /api/v1/admin/products/:id
export const detail = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm!'
            });
        }

        res.json({
            success: true,
            data: { product }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// [POST] /api/v1/admin/products
export const create = async (req, res) => {
    try {
        const {
            title,
            product_category_id,
            description,
            price,
            discountPercentage = 0,
            stock,
            thumbnail,
            status = 'active',
            featured = '0',
            position
        } = req.body;

        // Validation
        if (!title || !price || !stock) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin!'
            });
        }

        const product = new Product({
            title,
            product_category_id,
            description,
            price,
            discountPercentage,
            stock,
            thumbnail,
            status,
            featured,
            position,
            createdBy: {
                account_id: req.account._id,
                createdAt: new Date()
            }
        });

        await product.save();

        res.status(201).json({
            success: true,
            message: 'Tạo sản phẩm thành công!',
            data: { product }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// [PATCH] /api/v1/admin/products/:id
export const update = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // Add update tracking
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm!'
            });
        }

        product.updatedBy.push({
            account_id: req.account._id,
            updatedAt: new Date()
        });

        Object.assign(product, updateData);
        await product.save();

        res.json({
            success: true,
            message: 'Cập nhật sản phẩm thành công!',
            data: { product }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// [DELETE] /api/v1/admin/products/:id
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm!'
            });
        }

        product.deleted = true;
        product.deletedBy = {
            account_id: req.account._id,
            deletedAt: new Date()
        };
        await product.save();

        res.json({
            success: true,
            message: 'Xóa sản phẩm thành công!'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// [PATCH] /api/v1/admin/products/change-status/:id
export const changeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await Product.findByIdAndUpdate(id, { status });

        res.json({
            success: true,
            message: 'Cập nhật trạng thái thành công!'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// [PATCH] /api/v1/admin/products/change-multi
export const changeMulti = async (req, res) => {
    try {
        const { ids, type, value } = req.body;

        switch (type) {
            case 'status':
                await Product.updateMany(
                    { _id: { $in: ids } },
                    { status: value }
                );
                break;
            case 'delete':
                await Product.updateMany(
                    { _id: { $in: ids } },
                    {
                        deleted: true,
                        deletedBy: {
                            account_id: req.account._id,
                            deletedAt: new Date()
                        }
                    }
                );
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid type!'
                });
        }

        res.json({
            success: true,
            message: 'Cập nhật thành công!'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
