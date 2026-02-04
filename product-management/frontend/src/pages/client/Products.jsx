import { useEffect } from 'react';
import { useProductStore } from '../../stores/productStore';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate, useSearchParams } from 'react-router-dom';

const Products = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { products, pagination, loading, getProducts } = useProductStore();
    const { addToCart } = useCartStore();
    const { user } = useAuthStore();

    const searchQuery = searchParams.get('search') || '';

    useEffect(() => {
        const params = {};
        if (searchQuery) {
            params.keyword = searchQuery;
        }
        getProducts(params);
    }, [searchQuery, getProducts]);

    const handleAddToCart = async (productId) => {
        if (!user) {
            navigate('/login');
            return;
        }
        try {
            await addToCart(productId, 1);
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

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Đang tải sản phẩm...</p>
            </div>
        );
    }

    return (
        <div className="products-page">
            <div className="container">
                <h1 className="page-title">Sản Phẩm</h1>

                {/* Search Results Info */}
                {searchQuery && (
                    <div className="search-results-info">
                        <p>
                            Kết quả tìm kiếm cho: <strong>"{searchQuery}"</strong>
                            {pagination && ` - Tìm thấy ${pagination.total} sản phẩm`}
                        </p>
                        <button
                            className="clear-search-btn"
                            onClick={() => navigate('/products')}
                        >
                            ✕ Xóa tìm kiếm
                        </button>
                    </div>
                )}

                <div className="products-grid">
                    {products.map((product) => {
                        const priceNew = product.price * (100 - (product.discount_percentage || 0)) / 100;

                        return (
                            <div key={product.id} className="product-card">
                                <div className="product-image">
                                    <img src={product.thumbnail} alt={product.title} />
                                    {product.discount_percentage > 0 && (
                                        <span className="discount-badge">-{product.discount_percentage}%</span>
                                    )}
                                    {product.featured && (
                                        <span className="featured-badge">⭐ Nổi bật</span>
                                    )}
                                </div>

                                <div className="product-info">
                                    <h3 className="product-title">{product.title}</h3>

                                    {product.brand && (
                                        <p className="product-brand"> {product.brand}</p>
                                    )}

                                    <div className="product-price">
                                        {product.discount_percentage > 0 && (
                                            <span className="price-old">{formatPrice(product.price)}</span>
                                        )}
                                        <span className="price-new">{formatPrice(priceNew)}</span>
                                    </div>

                                    <div className="product-actions">
                                        <button
                                            className="btn-view"
                                            onClick={() => navigate(`/products/${product.slug}`)}
                                        >
                                            Xem chi tiết
                                        </button>
                                        <button
                                            className="btn-add-cart"
                                            onClick={() => handleAddToCart(product.id)}
                                        >
                                            🛒 Thêm vào giỏ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {pagination && pagination.totalPages > 1 && (
                    <div className="pagination">
                        {/* Previous Button */}
                        <button
                            className="page-btn"
                            onClick={() => getProducts({ page: pagination.page - 1 })}
                            disabled={pagination.page === 1}
                            style={{ opacity: pagination.page === 1 ? 0.5 : 1 }}
                        >
                            ← Trước
                        </button>

                        {/* Page Numbers */}
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                            <button
                                key={pageNum}
                                className={`page-btn ${pageNum === pagination.page ? 'active' : ''}`}
                                onClick={() => getProducts({ page: pageNum })}
                            >
                                {pageNum}
                            </button>
                        ))}

                        {/* Next Button */}
                        <button
                            className="page-btn"
                            onClick={() => getProducts({ page: pagination.page + 1 })}
                            disabled={pagination.page === pagination.totalPages}
                            style={{ opacity: pagination.page === pagination.totalPages ? 0.5 : 1 }}
                        >
                            Sau →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Products;
