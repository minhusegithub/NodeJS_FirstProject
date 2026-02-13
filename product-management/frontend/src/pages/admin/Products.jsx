import { useState, useEffect } from 'react';
import api from '../../services/axios';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const AdminProducts = () => {
    const { user } = useAuthStore();
    const isSystemAdmin = user?.roles?.some(
        r => r.roleName === 'SystemAdmin'
    );
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        page: 1,
        limit: 10,
        keyword: '',
        status: ''
    });
    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 0,
        currentPage: 1
    });

    useEffect(() => {
        fetchProducts();
    }, [filters.page, filters.status]); // Fetch when page or status changes

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/products', {
                params: filters
            });

            if (response.data.success) {
                setProducts(response.data.data.products);
                setPagination(response.data.data.pagination);
            }
        } catch (error) {
            console.error('Lỗi tải sản phẩm:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setFilters(prev => ({ ...prev, page: 1 })); // Reset về trang 1 khi search
        fetchProducts();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const calculateTotalStock = (inventory) => {
        if (!inventory) return 0;
        return inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
    };

    return (
        <div className="admin-page">
            <h1 className="admin-page-title">Quản lý Sản Phẩm</h1>

            {/* Filter Section */}
            <div className="admin-filters">
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', flex: 1 }}>
                    <input
                        type="text"
                        placeholder="Tìm kiếm sản phẩm..."
                        className="filter-input"
                        value={filters.keyword}
                        onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                    />
                    <button type="submit" className="btn-create">Tìm</button>
                </form>

                <select
                    className="filter-select"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="active">Đang bán</option>
                    <option value="inactive">Ngừng bán</option>
                </select>
            </div>

            {/* Table Section */}
            <div className="admin-table-container">
                <table className="admin-table">
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
                                <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                                    Đang tải dữ liệu...
                                </td>
                            </tr>
                        ) : products.length > 0 ? (
                            products.map(product => (
                                <tr key={product.id}>
                                    <td>
                                        <img
                                            src={product.thumbnail || 'https://via.placeholder.com/50'}
                                            alt={product.title}
                                            className="product-thumb"
                                            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                                        />
                                    </td>
                                    <td>
                                        <strong>{product.title}</strong>
                                        <p className="text-small" style={{ color: '#666', margin: 0 }}>SKU: {product.sku}</p>
                                    </td>
                                    <td>{product.category?.title || 'Chưa phân loại'}</td>
                                    <td style={{ fontWeight: 'bold', color: '#1E4A7B' }}>
                                        {formatCurrency(product.price)}
                                    </td>
                                    <td>
                                        {isSystemAdmin ? (
                                            <span className={(product.stock || 0) > 0 ? 'stock-ok' : 'stock-low'}>
                                                {product.stock || 0}
                                            </span>
                                        ) : (
                                            <span className={calculateTotalStock(product.inventory) > 0 ? 'stock-ok' : 'stock-low'}>
                                                {calculateTotalStock(product.inventory)}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`status-badge ${product.status}`}>
                                            {product.status === 'active' ? 'Đang bán' : 'Ngừng bán'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                                    Không tìm thấy sản phẩm nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
                <div className="pagination" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                    <button
                        disabled={pagination.currentPage === 1}
                        onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                        style={{ padding: '5px 10px', cursor: 'pointer' }}
                    >
                        Trước
                    </button>
                    <span>Trang {pagination.currentPage} / {pagination.totalPages}</span>
                    <button
                        disabled={pagination.currentPage === pagination.totalPages}
                        onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                        style={{ padding: '5px 10px', cursor: 'pointer' }}
                    >
                        Sau
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminProducts;
