import { ProductCategory } from '../../../models/sequelize/index.js';
import { Op } from 'sequelize';

// [GET] /api/v1/admin/product-categories
export const getCategories = async (req, res) => {
    try {
        const categories = await ProductCategory.findAll({
            attributes: ['id', 'title', 'parent_id', 'created_at', 'updated_at'],
            order: [['title', 'ASC']]
        });

        res.json({
            code: 200,
            message: 'Success',
            data: categories
        });
    } catch (error) {
        console.error('Get Categories Error:', error);
        res.status(500).json({
            code: 500,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

// [POST] /api/v1/admin/product-categories
// Create new category
export const createCategory = async (req, res) => {
    try {
        const { title, parent_id, description, thumbnail, status } = req.body;

        // Validate required fields
        if (!title || title.trim() === '') {
            return res.status(400).json({
                code: 400,
                message: 'Tên danh mục không được để trống'
            });
        }

        // Validate parent_id if provided
        if (parent_id) {
            const parentCategory = await ProductCategory.findByPk(parent_id);
            if (!parentCategory) {
                return res.status(404).json({
                    code: 404,
                    message: 'Danh mục cha không tồn tại'
                });
            }
        }

        // Create new category
        const newCategory = await ProductCategory.create({
            title: title.trim(),
            parent_id: parent_id || null,
            description: description || '',
            thumbnail: thumbnail || '',
            status: status || 'active',

        });

        res.status(201).json({
            code: 201,
            message: 'Tạo danh mục thành công',
            data: newCategory
        });
    } catch (error) {
        console.error('Create Category Error:', error);

        // Handle unique constraint error
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                code: 400,
                message: 'Tên danh mục đã tồn tại'
            });
        }

        res.status(500).json({
            code: 500,
            message: 'Lỗi khi tạo danh mục',
            error: error.message
        });
    }
};

// [PUT] /api/v1/admin/product-categories/:id
// Update category
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, parent_id, description, thumbnail, status } = req.body;

        // Find category
        const category = await ProductCategory.findByPk(id);
        if (!category) {
            return res.status(404).json({
                code: 404,
                message: 'Danh mục không tồn tại'
            });
        }

        // Validate title if provided
        if (title !== undefined && title.trim() === '') {
            return res.status(400).json({
                code: 400,
                message: 'Tên danh mục không được để trống'
            });
        }

        // Validate parent_id if provided
        if (parent_id !== undefined) {
            // Cannot set parent to itself
            if (parent_id && parseInt(parent_id) === parseInt(id)) {
                return res.status(400).json({
                    code: 400,
                    message: 'Danh mục không thể là cha của chính nó'
                });
            }

            // Check if parent exists
            if (parent_id) {
                const parentCategory = await ProductCategory.findByPk(parent_id);
                if (!parentCategory) {
                    return res.status(404).json({
                        code: 404,
                        message: 'Danh mục cha không tồn tại'
                    });
                }

                // Check for circular reference (prevent setting a descendant as parent)
                const isDescendant = async (categoryId, potentialDescendantId) => {
                    const children = await ProductCategory.findAll({
                        where: { parent_id: categoryId }
                    });

                    for (const child of children) {
                        if (parseInt(child.id) === parseInt(potentialDescendantId)) {
                            return true;
                        }
                        if (await isDescendant(child.id, potentialDescendantId)) {
                            return true;
                        }
                    }
                    return false;
                };

                if (await isDescendant(id, parent_id)) {
                    return res.status(400).json({
                        code: 400,
                        message: 'Không thể đặt danh mục con làm danh mục cha (tham chiếu vòng)'
                    });
                }
            }
        }

        // Build update data
        const updateData = {};
        if (title !== undefined) updateData.title = title.trim();
        if (parent_id !== undefined) updateData.parent_id = parent_id || null;
        if (description !== undefined) updateData.description = description;
        if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
        if (status !== undefined) updateData.status = status;


        // Update category
        await category.update(updateData);

        res.json({
            code: 200,
            message: 'Cập nhật danh mục thành công',
            data: category
        });
    } catch (error) {
        console.error('Update Category Error:', error);

        // Handle unique constraint error
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                code: 400,
                message: 'Tên danh mục đã tồn tại'
            });
        }

        res.status(500).json({
            code: 500,
            message: 'Lỗi khi cập nhật danh mục',
            error: error.message
        });
    }
};

// [DELETE] /api/v1/admin/product-categories/:id
// Delete category and all its descendants
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Find category
        const category = await ProductCategory.findByPk(id);
        if (!category) {
            return res.status(404).json({
                code: 404,
                message: 'Danh mục không tồn tại'
            });
        }

        // Recursive function to get all descendant IDs
        const getAllDescendantIds = async (categoryId) => {
            const descendants = [];
            const children = await ProductCategory.findAll({
                where: { parent_id: categoryId }
            });

            for (const child of children) {
                descendants.push(child.id);
                const childDescendants = await getAllDescendantIds(child.id);
                descendants.push(...childDescendants);
            }

            return descendants;
        };

        // Get all descendant IDs
        const descendantIds = await getAllDescendantIds(id);
        const allIdsToDelete = [parseInt(id), ...descendantIds];



        // Delete all categories (including the parent)
        const deletedCount = await ProductCategory.destroy({
            where: {
                id: allIdsToDelete
            },
            force: true // Hard delete (permanent)
        });

        res.json({
            code: 200,
            message: `Đã xóa ${deletedCount} danh mục thành công`,
            data: {
                deletedCount,
                deletedIds: allIdsToDelete
            }
        });
    } catch (error) {
        console.error('Delete Category Error:', error);
        res.status(500).json({
            code: 500,
            message: 'Lỗi khi xóa danh mục',
            error: error.message
        });
    }
};

