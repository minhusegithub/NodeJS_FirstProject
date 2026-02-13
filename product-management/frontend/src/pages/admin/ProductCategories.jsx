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
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <div className="loading-spinner"></div>
                    <p>Đang tải danh mục...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-page">
                <div style={{ textAlign: 'center', padding: '50px', color: '#dc2626' }}>
                    <p>❌ {error}</p>
                    <button
                        onClick={fetchCategories}
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
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
            <div className="admin-page-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="admin-page-title">Quản lý danh mục sản phẩm</h1>
                    <p className="text-muted" style={{ color: '#666' }}>
                        Tổng số: {categories.length} danh mục
                    </p>
                </div>
            </div>

            <div className="admin-table-container">
                {categories.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px', color: '#6b7280' }}>
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
                                    className="hover-row clickable-row"
                                    style={{
                                        backgroundColor: category.level > 0 ? '#f9fafb' : 'white',
                                        cursor: 'pointer'
                                    }}
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
                            <h2>Cập nhật danh mục</h2>
                            <button className="close-btn" onClick={handleCloseModal}>×</button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="title">
                                    Tên danh mục
                                </label>
                                <input
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
                                    className="btn-delete"
                                    onClick={handleDelete}
                                    disabled={submitting}
                                >
                                    Xóa danh mục
                                </button>

                                <div style={{ flex: 1 }}></div>

                                <button
                                    type="submit"
                                    className="btn-submit"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Đang xử lý...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .hover-row:hover {
                    background-color: #eef2ff !important;
                }
                .clickable-row:hover {
                    background-color: #e0e7ff !important;
                    transition: background-color 0.2s ease;
                }
                .category-name-cell {
                    font-family: 'Courier New', monospace;
                    white-space: pre;
                }
                .loading-spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid #e5e7eb;
                    border-top-color: #667eea;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .category-tree-table tbody tr[style*="background-color: white"] {
                    font-weight: 600;
                }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    animation: fadeIn 0.2s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .modal-content {
                    background: white;
                    border-radius: 12px;
                    padding: 0;
                    width: 90%;
                    max-width: 500px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    animation: slideUp 0.3s ease;
                }

                @keyframes slideUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    border-bottom: 1px solid #e5e7eb;
                }

                .modal-header h2 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 700;
                    color: #1f2937;
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 28px;
                    color: #9ca3af;
                    cursor: pointer;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                }

                .close-btn:hover {
                    background: #f3f4f6;
                    color: #1f2937;
                }

                .modal-content form {
                    padding: 24px;
                }

                .form-group {
                    margin-bottom: 20px;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #374151;
                    font-size: 14px;
                }

                .required {
                    color: #ef4444;
                }

                .form-group input {
                    width: 100%;
                    padding: 10px 14px;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    font-size: 14px;
                    transition: all 0.2s ease;
                    font-family: inherit;
                }

                .form-group input:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .form-group input:disabled {
                    background: #f9fafb;
                    cursor: not-allowed;
                }

                .form-hint {
                    display: block;
                    margin-top: 6px;
                    font-size: 12px;
                    color: #6b7280;
                }

                .form-hint strong {
                    color: #667eea;
                }

                .modal-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    margin-top: 24px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                }

                .btn-delete,
                .btn-submit {
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: none;
                }

                .btn-delete {
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    color: white;
                }

                .btn-delete:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
                }



                .btn-submit {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }

                .btn-submit:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }

               
                .btn-submit:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
};

export default AdminProductCategories;
