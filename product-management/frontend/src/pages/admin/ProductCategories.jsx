import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/axios';
import moment from 'moment';

const AdminProductCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        childCategoryName: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/admin/product-categories');

            if (response.data.code === 200) {
                setCategories(response.data.data);
            } else {
                setError(response.data.message || 'Lỗi tải danh sách danh mục sản phẩm');
                toast.error(response.data.message || 'Lỗi tải danh sách danh mục sản phẩm');
            }
        } catch (err) {
            console.error('Fetch categories error:', err);
            const errorMsg = err.response?.data?.message || err.message || 'Lỗi kết nối server';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Handle row click - open modal
    const handleRowClick = (category) => {
        setSelectedCategory(category);
        setFormData({
            title: category.title,
            childCategoryName: ''
        });
        setShowModal(true);
    };

    // Handle modal close
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedCategory(null);
        setFormData({
            title: '',
            childCategoryName: ''
        });
    };

    // Handle form input change
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCategory) return;

        setSubmitting(true);
        try {
            // Update category title if changed
            if (formData.title !== selectedCategory.title) {
                await api.put(`/admin/product-categories/${selectedCategory.id}`, {
                    title: formData.title
                });
                toast.success('Cập nhật tên danh mục thành công!');
            }

            // Create child category if provided
            if (formData.childCategoryName.trim()) {
                await api.post('/admin/product-categories', {
                    title: formData.childCategoryName.trim(),
                    parent_id: selectedCategory.id,
                    status: 'active',
                    position: 0
                });
                toast.success('Thêm danh mục con thành công!');
            }

            // Refresh categories
            await fetchCategories();
            handleCloseModal();
        } catch (err) {
            console.error('Update category error:', err);
            const errorMsg = err.response?.data?.message || 'Lỗi khi cập nhật danh mục';
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle delete category
    const handleDelete = async () => {
        if (!selectedCategory) return;

        // Confirmation dialog
        const confirmMessage = `⚠️⚠️⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa danh mục "${selectedCategory.title}" và TẤT CẢ danh mục con của nó?\n\n ⚠️⚠️⚠️ Hành động này KHÔNG THỂ HOÀN TÁC!`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        setSubmitting(true);
        try {
            const response = await api.delete(`/admin/product-categories/${selectedCategory.id}`);

            const deletedCount = response.data.data?.deletedCount || 1;
            toast.success(`Đã xóa ${deletedCount} danh mục thành công!`);

            // Refresh categories and close modal
            await fetchCategories();
            handleCloseModal();
        } catch (err) {
            console.error('Delete category error:', err);
            const errorMsg = err.response?.data?.message || 'Lỗi khi xóa danh mục';
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (date) => {
        return moment(date).format('DD/MM/YYYY HH:mm');
    };

    // Build tree structure from flat array
    const buildCategoryTree = (categories) => {
        const tree = [];
        const map = {};

        // Create a map of all categories
        categories.forEach(cat => {
            map[cat.id] = { ...cat, children: [] };
        });

        // Build the tree
        categories.forEach(cat => {
            if (cat.parent_id === null || cat.parent_id === undefined) {
                // Root category
                tree.push(map[cat.id]);
            } else {
                // Child category
                if (map[cat.parent_id]) {
                    map[cat.parent_id].children.push(map[cat.id]);
                }
            }
        });

        return tree;
    };

    // Flatten tree to array with level information
    const flattenTree = (tree, level = 0) => {
        let result = [];

        tree.forEach(node => {
            result.push({ ...node, level });
            if (node.children && node.children.length > 0) {
                result = result.concat(flattenTree(node.children, level + 1));
            }
        });

        return result;
    };

    // Get flattened categories with hierarchy
    const getHierarchicalCategories = () => {
        const tree = buildCategoryTree(categories);
        return flattenTree(tree);
    };

    const renderCategoryName = (category) => {
        const indent = '\u00A0\u00A0\u00A0\u00A0'.repeat(category.level); // 4 non-breaking spaces per level
        const prefix = category.level > 0 ? '└─ ' : '';

        return (
            <span>
                {indent}
                {prefix}
                {category.title}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="admin-page">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Đang tải danh mục...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-page">
                <div className="error-container">
                    <p>❌ {error}</p>
                    <button
                        onClick={fetchCategories}
                        className="btn-retry"
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    const hierarchicalCategories = getHierarchicalCategories();

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">Quản lý danh mục sản phẩm</h1>
                    <p className="text-muted">
                        Tổng số: {categories.length} danh mục
                    </p>
                </div>
            </div>

            <div className="admin-table-container">
                {categories.length === 0 ? (
                    <div className="empty-state">
                        <p>Chưa có danh mục nào</p>
                    </div>
                ) : (
                    <table className="admin-table category-tree-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Tên danh mục</th>
                                <th>Ngày cập nhật</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hierarchicalCategories.map(category => (
                                <tr
                                    key={category.id}
                                    onClick={() => handleRowClick(category)}
                                    className={`clickable-row ${category.level > 0 ? 'child-category' : 'parent-category'}`}
                                >
                                    <td><strong>#{category.id}</strong></td>
                                    <td className="category-name-cell">
                                        {renderCategoryName(category)}
                                    </td>

                                    <td>{formatDate(category.updated_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Update Category Modal */}
            {showModal && selectedCategory && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Cập nhật danh mục</div>
                            <button type="button" className="btn-close" onClick={handleCloseModal}>
                                ×
                            </button>
                            
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="title">
                                    Tên danh mục
                                </label>
                                <input
                                    className="category-input"
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    placeholder="Nhập tên danh mục"
                                    required
                                    disabled={submitting}
                                />

                            </div>

                            <div className="form-group">
                                <label htmlFor="childCategoryName">
                                    Thêm danh mục con (tùy chọn)
                                </label>
                                <input
                                    className="category-input"
                                    type="text"
                                    id="childCategoryName"
                                    name="childCategoryName"
                                    value={formData.childCategoryName}
                                    onChange={handleInputChange}
                                    placeholder="Nhập tên danh mục con mới"
                                    disabled={submitting}
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={submitting}
                                    style={{ backgroundColor: '#e44848', color: '#fff' , borderRadius: '8px',
                                            padding: '10px 20px', border: 'none'}}             
                                >
                                    <i className="fa-solid fa-trash"></i>                                    
                                </button>

                                <div className="spacer"></div>
                                <button
                                    type="submit"
                                    style={{ backgroundColor: '#1DB56C', color: '#fff', borderRadius: '8px',
                                        padding: '10px 20px', border: 'none'}}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Đang xử lý...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProductCategories;
