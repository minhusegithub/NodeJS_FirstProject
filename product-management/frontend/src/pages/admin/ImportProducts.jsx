import { useState, useEffect } from 'react';
import { useAdminProductStore } from '../../stores/admin/productStore';
import { Link } from 'react-router-dom';

const ImportProducts = () => {
    const { getImportableProducts, importProduct, loading } = useAdminProductStore();
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [filters, setFilters] = useState({ page: 1, limit: 10, keyword: '' });

    // Modal state for import
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [importQuantity, setImportQuantity] = useState('');

    const fetchData = async () => {
        try {
            const data = await getImportableProducts(filters);
            setProducts(data.products);
            setPagination(data.pagination);
        } catch (error) {
            console.error("Error fetching importable products:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters.page, filters.keyword]);

    const handleSearch = (e) => {
        e.preventDefault();
        setFilters(prev => ({ ...prev, page: 1 }));
    };

    const handleImportClick = (product) => {
        setSelectedProduct(product);
        setImportQuantity('');
    };

    const handleImportSubmit = async (e) => {
        e.preventDefault();
        if (!selectedProduct) return;

        const qty = parseInt(importQuantity);
        if (!qty || qty <= 0) {
            alert("Số lượng phải > 0");
            return;
        }

        if (qty > selectedProduct.stock) {
            alert(`Kho chính chỉ còn ${selectedProduct.stock} sản phẩm`);
            return;
        }

        try {
            await importProduct({
                product_id: selectedProduct.id,
                quantity: qty
            }, false); // don't refetch main product list, we refetch import list

            setSelectedProduct(null);
            fetchData(); // Refresh list to remove imported product or update status
        } catch (error) {
            // Toast handled in store
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <div className="admin-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 className="admin-page-title">Nhập sản phẩm mới từ Kho Chính</h1>

            </div>

            {/* Filter */}
            <div className="admin-filters">
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', flex: 1 }}>
                    <input
                        type="text"
                        placeholder="Tìm sản phẩm..."
                        className="filter-input"
                        value={filters.keyword}
                        onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                    />
                    <button type="submit" className="btn-create">Tìm</button>
                </form>
            </div>

            {/* Table */}
            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Ảnh</th>
                            <th>Tên sản phẩm</th>
                            <th>SKU</th>
                            <th>Danh mục</th>
                            <th>Tồn kho chính</th>

                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="text-center">Đang tải...</td></tr>
                        ) : products.length > 0 ? (
                            products.map(product => (
                                <tr key={product.id} onClick={() => handleImportClick(product)}>
                                    <td>
                                        <img
                                            src={product.thumbnail || 'https://via.placeholder.com/50'}
                                            alt={product.title}
                                            style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                        />
                                    </td>
                                    <td>{product.title}</td>
                                    <td>{product.sku}</td>
                                    <td>{product.category?.title || "Chưa phân loại"}</td>
                                    <td style={{ fontWeight: 'bold', color: product.stock > 0 ? 'green' : 'red' }}>
                                        {product.stock}
                                    </td>

                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="6" className="text-center">Không có sản phẩm nào để nhập.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="pagination" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                    <button disabled={pagination.currentPage === 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Trước</button>
                    <span>Trang {pagination.currentPage} / {pagination.totalPages}</span>
                    <button disabled={pagination.currentPage === pagination.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Sau</button>
                </div>
            )}

            {/* Import Modal */}
            {selectedProduct && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>Nhập hàng: {selectedProduct.title}</h3>

                        </div>
                        <div className="modal-body" style={{ padding: '20px' }}>
                            <p><strong>Tồn kho chính:</strong> {selectedProduct.stock}</p>
                            <div className="form-group" style={{ marginTop: '15px' }}>
                                <label>Số lượng muốn nhập:</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    min="1"
                                    max={selectedProduct.stock}
                                    value={importQuantity}
                                    onChange={(e) => setImportQuantity(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button className="btn-secondary" onClick={() => setSelectedProduct(null)}>Hủy</button>
                                <button className="btn-primary" onClick={handleImportSubmit}>Xác nhận nhập</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportProducts;
