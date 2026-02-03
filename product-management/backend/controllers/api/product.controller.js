import Product from '../../models/product.model.js';

// [GET] /api/v1/products
export const index = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 6,
            keyword = '',
            category = '',
            sortKey = 'position',
            sortValue = 'desc'
        } = req.query;

        const find = {
            deleted: false,
            status: 'active'
        };

        // Search by keyword
        if (keyword) {
            const regex = new RegExp(keyword, 'i');
            find.title = regex;
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
            .skip(skip)
            .select('-deleted -deletedBy -updatedBy -createdBy');

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

// [GET] /api/v1/products/:slug
export const detail = async (req, res) => {
    try {
        const { slug } = req.params;

        const product = await Product
            .findOne({
                slug,
                deleted: false,
                status: 'active'
            })
            .select('-deleted -deletedBy -updatedBy -createdBy');

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

// [GET] /api/v1/products/featured
export const featured = async (req, res) => {
    try {
        const products = await Product
            .find({
                deleted: false,
                status: 'active',
                featured: '1'
            })
            .sort({ position: -1 })
            .limit(6)
            .select('-deleted -deletedBy -updatedBy -createdBy');

        res.json({
            success: true,
            data: { products }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
