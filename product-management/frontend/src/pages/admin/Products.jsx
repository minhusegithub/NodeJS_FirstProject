import { useState, useEffect, useRef } from 'react';
import api from '../../services/axios';
import { useAuthStore } from '../../stores/authStore';
import { useAdminProductStore } from '../../stores/admin/productStore';
import '../../assets/styles/admin-products.css';

const AdminProducts = () => {
    const { user } = useAuthStore();
    const {
        products,
        loading,
        pagination,
        getProducts,
        createProduct,
        updateProduct,
        getProduct,
        importProduct
    } = useAdminProductStore();

    const isSystemAdmin = user?.roles?.some(
        r => r.roleName === 'SystemAdmin'
    );

    const [filters, setFilters] = useState({
        page: 1,
        limit: 7,
        keyword: '',
        status: ''
    });

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [categories, setCategories] = useState([]);
    const [newProduct, setNewProduct] = useState({
        title: '',
        sku: '',
        category_id: '',
        price: 0,
        discount_percentage: 0,
        stock: 0,
        description: '',
        status: 'active',
        thumbnail: null
    });
    const [previewImage, setPreviewImage] = useState(null);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const debounceTimerRef = useRef(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    // Debounce only the keyword input
    useEffect(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            setDebouncedKeyword(filters.keyword);
        }, 1000);
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [filters.keyword]);

    // Fetch immediately when page, status, or debounced keyword changes
    useEffect(() => {
        getProducts({ ...filters, keyword: debouncedKeyword });
    }, [debouncedKeyword, filters.page, filters.status, getProducts]);

    const fetchCategories = async () => {
        try {
            const response = await api.get('/products/categories/tree');
            if (response.data.code === 200) {
                const flatCats = [];
                const flatten = (cats, prefix = '') => {
                    cats.forEach(c => {
                        flatCats.push({ ...c, title: prefix + c.title });
                        if (c.children) flatten(c.children, prefix + '-- ');
                    });
                };
                flatten(response.data.data);
                setCategories(flatCats);
            }
        } catch (error) {
            console.error("Error fetching categories", error);
        }
    };

    const handleCreateInputChange = (e) => {
        const { name, value } = e.target;
        setNewProduct(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewProduct(prev => ({ ...prev, thumbnail: file }));
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            Object.keys(newProduct).forEach(key => {
                if (key === 'thumbnail') {
                    if (newProduct.thumbnail) formData.append('thumbnail', newProduct.thumbnail);
                } else {
                    formData.append(key, newProduct[key]);
                }
            });

            await createProduct(formData);

            setShowCreateModal(false);
            setNewProduct({
                title: '', sku: '', category_id: '', price: 0, discount_percentage: 0, stock: 0, description: '', status: 'active', thumbnail: null
            });
            setPreviewImage(null);
        } catch (error) {
            // Error handled by store toast
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const calculateTotalStock = (inventory) => {
        if (!inventory) return 0;
        return inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
    };

    const handleEditClick = async (product) => {
        try {
            const productData = await getProduct(product.id);
            if (productData) {
                // If store manager, populate stock from inventory[0]
                let currentStoreStock = 0;
                if (productData.inventory && productData.inventory.length > 0) {
                    currentStoreStock = productData.inventory[0].stock;
                }

                setEditingProduct({
                    ...productData,
                    currentStoreStock: currentStoreStock,
                    mainStock: productData.stock, // Main warehouse stock
                    stock: isSystemAdmin ? productData.stock : 0, // For Admin: stock value. For Staff: import quantity (init 0)
                    previewThumbnail: productData.thumbnail
                });
                setPreviewImage(productData.thumbnail);
                setShowEditModal(true);
            }
        } catch (error) {
            console.error("Error fetching product details:", error);
            // toast handled by store
        }
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditingProduct(prev => ({ ...prev, [name]: value }));
    };

    const handleEditImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setEditingProduct(prev => ({ ...prev, thumbnailFile: file }));
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!isSystemAdmin) {
                // Handle Import Stock for Store Staff
                const importQty = parseInt(editingProduct.stock);

                if (!importQty || importQty <= 0) {
                    alert("Số lượng nhập phải lớn hơn 0");
                    return;
                }

                if (importQty > editingProduct.mainStock) {
                    alert(`Kho chính không đủ hàng (Còn: ${editingProduct.mainStock})`);
                    return;
                }

                await importProduct({
                    product_id: editingProduct.id,
                    quantity: importQty
                });

            } else {
                // Handle Update for System Admin
                const formData = new FormData();
                formData.append('title', editingProduct.title || '');
                formData.append('sku', editingProduct.sku || '');
                formData.append('category_id', editingProduct.category_id || editingProduct.product_category_id || '');
                formData.append('price', editingProduct.price || 0);
                formData.append('discount_percentage', editingProduct.discount_percentage || 0);
                formData.append('stock', editingProduct.stock || 0);
                formData.append('description', editingProduct.description || '');
                formData.append('status', editingProduct.status || 'active');

                if (editingProduct.thumbnailFile) {
                    formData.append('thumbnail', editingProduct.thumbnailFile);
                }

                await updateProduct(editingProduct.id, formData);
            }

            setShowEditModal(false);
            setEditingProduct(null);
            setPreviewImage(null);
        } catch (error) {
            // Error handled by store toast
        }
    };

    return (
        <div className="admin-products">
            <div className="ap-container">
            <h1 className="ap-page-title">Quản lý Sản Phẩm</h1>

            {/* Filter Section */}
            <div className="ap-filters">
                <input
                    type="text"
                    placeholder="Tìm kiếm theo tên sản phẩm hoặc SKU..."
                    className="ap-filter-input"
                    value={filters.keyword}
                    onChange={(e) => setFilters({ ...filters, keyword: e.target.value, page: 1 })}
                />

                <select
                    className="ap-filter-select"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="active">Đang bán</option>
                    <option value="inactive">Ngừng bán</option>
                </select>

                {isSystemAdmin && (
                    <button
                        className="ap-btn-create"
                        onClick={() => setShowCreateModal(true)}
                    >
                        + Tạo mới
                    </button>
                )}
            </div>

            {/* Table Section */}
            <div className="ap-table-container">
                <table className="ap-table">
                    <thead>
                        <tr>
                            <th>Ảnh</th>
                            <th>Tên sản phẩm</th>
                            <th>Danh mục</th>
                            <th>Giá</th>
                            <th>{isSystemAdmin ? 'Tồn kho (Kho chính)' : 'Tồn kho (Tại cửa hàng)'}</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="ap-empty-cell">
                                    <div className="ap-loading-spinner"></div>
                                    Đang tải dữ liệu...
                                </td>
                            </tr>
                        ) : products.length > 0 ? (
                            products.map(product => (
                                <tr key={product.id} onClick={() => handleEditClick(product)} className="ap-clickable-row">
                                    <td className="ap-td-center">
                                        <img
                                            src={product.thumbnail || 'https://via.placeholder.com/50'}
                                            alt={product.title}
                                            className="ap-product-thumb"
                                        />
                                    </td>
                                    <td>
                                        <strong className="ap-product-name">{product.title}</strong>
                                        <p className="ap-product-sku">SKU: {product.sku}</p>
                                    </td>
                                    <td className="ap-td-center">
                                        <span className="ap-category-badge">
                                            {product.category?.title || 'Chưa phân loại'}
                                        </span>
                                    </td>
                                    <td className="ap-td-center ap-price">
                                        {formatCurrency(product.price)}
                                    </td>
                                    <td className="ap-td-center">
                                        {isSystemAdmin ? (
                                            <span className={(product.stock || 0) > 0 ? 'ap-stock-ok' : 'ap-stock-low'}>
                                                {product.stock || 0}
                                            </span>
                                        ) : (
                                            <span className={calculateTotalStock(product.inventory) > 0 ? 'ap-stock-ok' : 'ap-stock-low'}>
                                                {calculateTotalStock(product.inventory)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="ap-td-center">
                                        <span className={`ap-status-badge ap-status-${product.status}`}>
                                            {product.status === 'active' ? 'Đang bán' : 'Ngừng bán'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="ap-empty-cell">
                                    Không tìm thấy sản phẩm nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
                <div className="ap-pagination">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                        <button
                            key={page}
                            className={`ap-page-btn ${page === filters.page ? 'active' : ''}`}
                            onClick={() => setFilters({ ...filters, page })}
                        >
                            {page}
                        </button>
                    ))}
                </div>
            )}

            {/* Create Product Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div className="modal-title">Thêm sản phẩm mới</div>
                            <button className="btn-close" onClick={() => setShowCreateModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreateSubmit} className="modal-form">
                            <div className="form-row">
                                <div className="form-group form-col">
                                    <label>Tên sản phẩm <span className="text-danger">*</span></label>
                                    <input
                                        type="text" name="title" required
                                        value={newProduct.title} onChange={handleCreateInputChange}
                                        className="form-control"
                                        placeholder="Nhập tên sản phẩm"
                                    />
                                </div>
                                <div className="form-group form-col">
                                    <label>SKU</label>
                                    <input
                                        type="text" name="sku"
                                        value={newProduct.sku} onChange={handleCreateInputChange}
                                        className="form-control"
                                        placeholder="Mã SKU"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Danh mục</label>
                                <select
                                    name="category_id"
                                    value={newProduct.category_id} onChange={handleCreateInputChange}
                                    className="form-control"
                                    style={{ padding: '5px' }}
                                >
                                    <option value="">-- Chọn danh mục --</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group form-col">
                                    <label>Giá bán (VND) <span className="text-danger">*</span></label>
                                    <input
                                        type="number" name="price" required min="0"
                                        value={newProduct.price} onChange={handleCreateInputChange}
                                        className="form-control"
                                    />
                                </div>
                                <div className="form-group form-col">
                                    <label>Giảm giá (%)</label>
                                    <input
                                        type="number" name="discount_percentage" min="0" max="100"
                                        value={newProduct.discount_percentage} onChange={handleCreateInputChange}
                                        className="form-control"
                                    />
                                </div>
                            </div>

                            {isSystemAdmin && (
                                <div className="form-group">
                                    <label>Tồn kho (Kho chính)</label>
                                    <input
                                        type="number" name="stock" min="0"
                                        value={newProduct.stock} onChange={handleCreateInputChange}
                                        className="form-control"
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Ảnh sản phẩm</label>
                                <div className="image-upload-wrapper">
                                    <input
                                        type="file" accept="image/*"
                                        onChange={handleImageChange}
                                        id="product-image-upload"
                                        className="hidden-input"
                                    />
                                    <label htmlFor="product-image-upload" className="upload-label">
                                        {previewImage ? 'Thay đổi ảnh' : 'Chọn ảnh mới'}
                                    </label>
                                </div>
                                {previewImage && (
                                    <div className="image-preview-container">
                                        <img src={previewImage} alt="Preview" className="image-preview" />
                                        <button
                                            type="button"
                                            className="btn-remove-image"
                                            onClick={() => {
                                                setNewProduct(prev => ({ ...prev, thumbnail: null }));
                                                setPreviewImage(null);
                                            }}
                                        >
                                            Xóa ảnh
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Mô tả</label>
                                <textarea
                                    name="description" rows="4"
                                    value={newProduct.description} onChange={handleCreateInputChange}
                                    // className="form-control"
                                    placeholder="Mô tả chi tiết sản phẩm..."
                                />
                            </div>

                            <div className="form-group">
                                <label>Trạng thái</label>
                                <select
                                    name="status"
                                    value={newProduct.status} onChange={handleCreateInputChange}
                                    className="form-control"
                                    style={{ padding: '5px' }}
                                >
                                    <option value="active">Đang bán</option>
                                    <option value="inactive">Ngừng bán</option>
                                </select>
                            </div>

                            <div className="modal-actions">
                                
                                <button
                                    type="submit"
                                    className="store-btn btn-store-submit"
                                >
                                    Tạo sản phẩm
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {showEditModal && editingProduct && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div className="modal-title">Cập nhật sản phẩm</div>
                            
                            <button className="btn-close" onClick={() => setShowEditModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleUpdateSubmit} className="modal-form">
                            <div className="form-row">
                                <div className="form-group form-col">
                                    <label>Tên sản phẩm <span className="text-danger">*</span></label>
                                    <input
                                        type="text" name="title" required
                                        value={editingProduct.title} onChange={handleEditInputChange}
                                        className="form-control"
                                        disabled={!isSystemAdmin}
                                    />
                                </div>
                                <div className="form-group form-col">
                                    <label>SKU</label>
                                    <input
                                        type="text" name="sku"
                                        value={editingProduct.sku} onChange={handleEditInputChange}
                                        className="form-control"
                                        disabled={!isSystemAdmin}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Danh mục</label>
                                <select
                                    name="category_id"
                                    value={editingProduct.category_id || editingProduct.product_category_id} onChange={handleEditInputChange}
                                    className="form-control"
                                    disabled={!isSystemAdmin}
                                    style={{ padding: '5px' }}
                                >
                                    <option value="">-- Chọn danh mục --</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group form-col">
                                    <label>Giá bán (VND) <span className="text-danger">*</span></label>
                                    <input
                                        type="number" name="price" required min="0"
                                        value={editingProduct.price} onChange={handleEditInputChange}
                                        className="form-control"
                                        disabled={!isSystemAdmin}
                                    />
                                </div>
                                <div className="form-group form-col">
                                    <label>Giảm giá (%)</label>
                                    <input
                                        type="number" name="discount_percentage" min="0" max="100"
                                        value={editingProduct.discount_percentage} onChange={handleEditInputChange}
                                        className="form-control"
                                        disabled={!isSystemAdmin}
                                    />
                                </div>
                            </div>

                            {isSystemAdmin ? (
                                <div className="form-group">
                                    <label>Tồn kho (Kho chính)</label>
                                    <input
                                        type="number" name="stock" min="0"
                                        value={editingProduct.stock} onChange={handleEditInputChange}
                                        className="form-control"
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="form-group">
                                        <label>Tồn kho hiện tại (Tại cửa hàng)</label>
                                        <input
                                            type="text"
                                            value={editingProduct.currentStoreStock || 0}
                                            className="form-control"
                                            disabled
                                            style={{ backgroundColor: '#f0f0f0' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Số lượng muốn nhập thêm ( tối đa: <i>{editingProduct.mainStock}</i> )  <span className="text-danger">*</span></label>
                                        <input
                                            type="number" name="stock" min="1" max={editingProduct.mainStock}
                                            value={editingProduct.stock} onChange={handleEditInputChange}
                                            className="form-control"
                                            placeholder="Nhập số lượng..."
                                            autoFocus
                                        />
                                    </div>
                                </>
                            )}

                            <div className="form-group">
                                <label>Ảnh sản phẩm</label>
                                {isSystemAdmin ? (
                                    <>
                                        <div className="image-upload-wrapper">
                                            <input
                                                type="file" accept="image/*"
                                                onChange={handleEditImageChange}
                                                id="edit-product-image-upload"
                                                className="hidden-input"
                                            />
                                            <label htmlFor="edit-product-image-upload" className="upload-label">
                                                {previewImage ? 'Thay đổi ảnh' : 'Chọn ảnh mới'}
                                            </label>
                                        </div>
                                        {previewImage && (
                                            <div className="image-preview-container">
                                                <img src={previewImage} alt="Preview" className="image-preview" />
                                                <button
                                                    type="button"
                                                    className="btn-remove-image"
                                                    onClick={() => {
                                                        setEditingProduct(prev => ({ ...prev, thumbnailFile: null }));
                                                        setPreviewImage(null);
                                                    }}
                                                >
                                                    Xóa ảnh
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    editingProduct.thumbnail && (
                                        <div className="image-preview-container">
                                            <img src={editingProduct.thumbnail} alt="Product" className="image-preview" />
                                        </div>
                                    )
                                )}
                            </div>

                            <div className="form-group">
                                <label>Mô tả</label>
                                <textarea
                                    name="description" rows="4"
                                    value={editingProduct.description} onChange={handleEditInputChange}
                                    className="form-control"
                                    disabled={!isSystemAdmin}
                                />
                            </div>

                            <div className="form-group">
                                <label>Trạng thái</label>
                                <select
                                    name="status"
                                    value={editingProduct.status} onChange={handleEditInputChange}
                                    className="form-control"
                                    disabled={!isSystemAdmin}
                                    style={{ padding: '5px' }}
                                >
                                    <option value="active">Đang bán</option>
                                    <option value="inactive">Ngừng bán</option>
                                </select>
                            </div>

                            <div className="modal-actions">
                                
                                <button
                                    type="submit"
                                    className="store-btn btn-store-submit"
                                >
                                    Cập nhật
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default AdminProducts;
