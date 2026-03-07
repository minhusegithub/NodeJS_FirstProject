import { useState, useEffect, useRef } from 'react';
import { useAdminProductStore } from '../../stores/admin/productStore';

const ImportProducts = () => {
    const { getImportableProducts, importProduct, loading } = useAdminProductStore();
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [filters, setFilters] = useState({ page: 1, limit: 10, keyword: '' });
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const debounceTimerRef = useRef(null);

    // Modal state for import
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [importQuantity, setImportQuantity] = useState('');

    const fetchData = async (filtersToUse) => {
        try {
            const data = await getImportableProducts(filtersToUse);
            setProducts(data.products);
            setPagination(data.pagination);
        } catch (error) {
            console.error("Error fetching importable products:", error);
        }
    };

    // Debounce only the keyword input
    useEffect(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            setDebouncedKeyword(filters.keyword);
        }, 1000);
        return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
    }, [filters.keyword]);

    // Fetch immediately when page or debouncedKeyword changes
    useEffect(() => {
        fetchData({ ...filters, keyword: debouncedKeyword });
    }, [filters.page, debouncedKeyword]);

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
            fetchData({ ...filters, keyword: debouncedKeyword }); // Refresh list
        } catch (error) {
            // Toast handled in store
        }
    };

    return (
        <div className="admin-page import-products-page">
            <div className="container">
                {/* Filter */}
                <div className="admin-filters import-products-filters">
                <form onSubmit={handleSearch} className="import-products-search-form">
                    <input
                        type="text"
                        placeholder="Tìm theo tên sản phẩm, SKU..."
                        className="filter-input import-products-search-input"
                        value={filters.keyword}
                        onChange={(e) => setFilters({ ...filters, keyword: e.target.value, page: 1 })}
                    />
                    
                </form>
            </div>

            {/* Table */}
            <div className="admin-table-container import-products-table-wrap">
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
                                <tr key={product.id} className="clickable-row" onClick={() => handleImportClick(product)}>
                                    <td>
                                        <img
                                            src={product.thumbnail || 'https://via.placeholder.com/50'}
                                            alt={product.title}
                                            className="import-product-thumb"
                                        />
                                    </td>
                                    <td className="import-product-title">{product.title}</td>
                                    <td className="import-product-sku">{product.sku}</td>
                                    <td>{product.category?.title || "Chưa phân loại"}</td>
                                    <td className={`import-product-stock ${product.stock > 0 ? 'in-stock' : 'out-stock'}`}>
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
                <div className="pagination import-products-pagination">
                    <button
                        className="import-products-page-btn import-products-page-nav"
                        onClick={() => setFilters({ ...filters, page: 1 })}
                        disabled={filters.page === 1}
                    >
                        &laquo;
                    </button>
                    <button
                        className="import-products-page-btn import-products-page-nav"
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
                                className={`import-products-page-btn ${page === current ? 'active' : ''}`}
                                onClick={() => setFilters({ ...filters, page })}
                            >
                                {page}
                            </button>
                        ));
                    })()}

                    <button
                        className="import-products-page-btn import-products-page-nav"
                        onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                        disabled={filters.page === pagination.totalPages}
                    >
                        &rarr;
                    </button>
                    <button
                        className="import-products-page-btn import-products-page-nav"
                        onClick={() => setFilters({ ...filters, page: pagination.totalPages })}
                        disabled={filters.page === pagination.totalPages}
                    >
                        &raquo;
                    </button>
                </div>
            )}

            {/* Import Modal */}
            {selectedProduct && (
                <div className="modal-overlay">
                    <div className="modal-content import-products-modal">
                        <div className="modal-header import-products-modal-header">          
                            <div className="modal-title">Nhập hàng: {selectedProduct.title}</div>
                            <button type="button" className="btn-close" onClick={() => setSelectedProduct(null)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body import-products-modal-body">
                            <p className="import-products-stock-note">Tồn kho chính: {selectedProduct.stock}</p>
                            <div className="form-group import-products-quantity-group">
                                <label>Số lượng muốn nhập:</label>
                                <input
                                    type="number"
                                    className="form-control import-products-quantity-input"
                                    min="1"
                                    max={selectedProduct.stock}
                                    value={importQuantity}
                                    onChange={(e) => setImportQuantity(e.target.value)}
                                    
                                />
                            </div>
                            <div className="import-products-modal-actions">
                                
                                <button className="btn-import-submit" onClick={handleImportSubmit}>Xác nhận nhập</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default ImportProducts;
