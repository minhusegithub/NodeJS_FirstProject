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
        getProduct
    } = useAdminProductStore();

    const isSystemAdmin = user?.roles?.some(
        r => r.roleName === 'SystemAdmin'
    );

    const [filters, setFilters] = useState({
        page: 1,
        limit: 7,
        keyword: '',
        status: '',
        stockThreshold: ''
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
        getProducts({
            ...filters,
            keyword: debouncedKeyword,
            status: isSystemAdmin ? undefined : filters.status,
            stock_threshold: filters.stockThreshold || undefined
        });
    }, [debouncedKeyword, filters.page, filters.status, filters.stockThreshold, getProducts]);

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
                title: '', sku: '', category_id: '', price: 0, discount_percentage: 0, stock: 0, description: '', thumbnail: null
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

    const getProductStock = (product) => {
        return isSystemAdmin ? (parseInt(product.stock, 10) || 0) : calculateTotalStock(product.inventory);
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
                    mainStock: parseInt(productData.stock, 10) || 0,
                    stock: isSystemAdmin ? (parseInt(productData.stock, 10) || 0) : currentStoreStock,
                    importQuantity: 0,
                    status: productData.inventory?.[0]?.status || productData.status || 'active',
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
                const importQty = parseInt(editingProduct.importQuantity, 10);
                if (!Number.isInteger(importQty) || importQty < 0) {
                    alert('Số lượng muốn nhập không hợp lệ (>= 0)');
                    return;
                }
                if (importQty > (editingProduct.mainStock || 0)) {
                    alert(`Kho chính không đủ hàng (Còn: ${editingProduct.mainStock || 0})`);
                    return;
                }

                await updateProduct(editingProduct.id, {
                    import_quantity: importQty,
                    status: editingProduct.status || 'active'
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
                    value={filters.stockThreshold}
                    onChange={(e) => setFilters({ ...filters, stockThreshold: e.target.value, page: 1 })}
                >
                    <option value="">Sắp xếp: A-Z</option>
                    <option value="10">Tồn kho dưới 10</option>
                    <option value="20">Tồn kho dưới 20</option>
                    <option value="30">Tồn kho dưới 30</option>
                </select>

                {!isSystemAdmin && (
                    <select
                        className="ap-filter-select"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="active">Đang bán</option>
                        <option value="inactive">Ngừng bán</option>
                    </select>
                )}

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
                            <th>Tồn kho</th>
                            {!isSystemAdmin && <th>Trạng thái</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={isSystemAdmin ? 5 : 6} className="ap-empty-cell">
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
                                        <span className={getProductStock(product) > 0 ? 'ap-stock-ok' : 'ap-stock-low'}>
                                            {getProductStock(product)}
                                        </span>
                                    </td>
                                    {!isSystemAdmin && (
                                        <td className="ap-td-center">
                                            <span className={`ap-status-badge ap-status-${product.status || 'active'}`}>
                                                {(product.status || 'active') === 'active' ? 'Đang bán' : 'Ngừng bán'}
                                            </span>
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={isSystemAdmin ? 5 : 6} className="ap-empty-cell">
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
                    <button
                        className="ap-page-btn ap-page-nav"
                        onClick={() => setFilters({ ...filters, page: 1 })}
                        disabled={filters.page === 1}
                    >
                        &laquo;
                    </button>
                    <button
                        className="ap-page-btn ap-page-nav"
                        onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                        disabled={filters.page === 1}
                    >
                        &larr;
                    </button>

                    {(() => {
                        const total = pagination.totalPages;
                        const current = filters.page;
                        let startPage, endPage;

                        if (total <= 3) {
                            startPage = 1;
                            endPage = total;
                        } else if (current <= 1) {
                            startPage = 1;
                            endPage = 3;
                        } else if (current >= total) {
                            startPage = total - 2;
                            endPage = total;
                        } else {
                            startPage = current - 1;
                            endPage = current + 1;
                        }

                        return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
                            <button
                                key={page}
                                className={`ap-page-btn ${page === current ? 'active' : ''}`}
                                onClick={() => setFilters({ ...filters, page })}
                            >
                                {page}
                            </button>
                        ));
                    })()}

                    <button
                        className="ap-page-btn ap-page-nav"
                        onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                        disabled={filters.page === pagination.totalPages}
                    >
                        &rarr;
                    </button>
                    <button
                        className="ap-page-btn ap-page-nav"
                        onClick={() => setFilters({ ...filters, page: pagination.totalPages })}
                        disabled={filters.page === pagination.totalPages}
                    >
                        &raquo;
                    </button>
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
                                            type="number"
                                            value={editingProduct.currentStoreStock || 0}
                                            className="form-control"
                                            disabled
                                            style={{ backgroundColor: '#f0f0f0' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Tồn kho kho chính</label>
                                        <input
                                            type="number"
                                            value={editingProduct.mainStock || 0}
                                            className="form-control"
                                            disabled
                                            style={{ backgroundColor: '#f0f0f0' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Số lượng muốn nhập </label>
                                        <input
                                            type="number"
                                            name="importQuantity"
                                            min="0"
                                            max={editingProduct.mainStock || 0}
                                            value={editingProduct.importQuantity ?? 0}
                                            onChange={handleEditInputChange}
                                            className="form-control"
                                            placeholder="Nhập số lượng cần nhập"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Trạng thái tại cửa hàng</label>
                                        <select
                                            name="status"
                                            value={editingProduct.status || 'active'}
                                            onChange={handleEditInputChange}
                                            className="form-control"
                                            style={{ padding: '5px' }}
                                        >
                                            <option value="active">Đang bán</option>
                                            <option value="inactive">Ngừng bán</option>
                                        </select>
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
