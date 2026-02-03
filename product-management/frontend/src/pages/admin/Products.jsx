import { useEffect, useState } from 'react';
import { useAdminProductStore } from '/src/stores/admin/productStore.js';
import { useNavigate } from 'react-router-dom';

const AdminProducts = () => {
    const navigate = useNavigate();
    const { products, pagination, loading, getProducts, deleteProduct, changeStatus } = useAdminProductStore();
    const [filters, setFilters] = useState({
        keyword: '',
        status: '',
        page: 1
    });

    useEffect(() => {
        getProducts(filters);
    }, [filters, getProducts]);

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
            try {
                await deleteProduct(id);
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleChangeStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            await changeStatus(id, newStatus);
        } catch (error) {
            console.error(error);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    };

    return (
        <div className="admin-products">
            <div className="container">
                <div className="admin-header">
                    <h1 className="admin-page-title">Quản lý Sản phẩm</h1>
                    <button className="btn-create" onClick={() => navigate('/admin/products/create')}>
                        + Tạo sản phẩm mới
                    </button>
                </div>

                {/* Filters */}
                <div className="admin-filters">
                    <input
                        type="text"
                        placeholder="Tìm kiếm sản phẩm..."
                        value={filters.keyword}
                        onChange={(e) => setFilters({ ...filters, keyword: e.target.value, page: 1 })}
                        className="filter-input"
                    />
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                        className="filter-select"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="active">Hoạt động</option>
                        <option value="inactive">Không hoạt động</option>
                    </select>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                    </div>
                ) : (
                    <>
                        {/* Products Table */}
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Ảnh</th>
                                        <th>Tên sản phẩm</th>
                                        <th>Giá</th>
                                        <th>Giảm giá</th>
                                        <th>Kho</th>
                                        <th>Trạng thái</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product) => (
                                        <tr key={product._id}>
                                            <td>
                                                <img src={product.thumbnail} alt={product.title} className="product-thumb" />
                                            </td>
                                            <td>
                                                <strong>{product.title}</strong>
                                            </td>
                                            <td>{formatPrice(product.price)}</td>
                                            <td>{product.discountPercentage}%</td>
                                            <td>
                                                <span className={product.stock < 10 ? 'stock-low' : 'stock-ok'}>
                                                    {product.stock}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className={`status-badge ${product.status}`}
                                                    onClick={() => handleChangeStatus(product._id, product.status)}
                                                >
                                                    {product.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                                                </button>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="btn-edit"
                                                        onClick={() => navigate(`/admin/products/edit/${product._id}`)}
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        className="btn-delete"
                                                        onClick={() => handleDelete(product._id)}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="pagination">
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        className={`page-btn ${page === pagination.currentPage ? 'active' : ''}`}
                                        onClick={() => setFilters({ ...filters, page })}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminProducts;
