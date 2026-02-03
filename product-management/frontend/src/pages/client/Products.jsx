import { useEffect } from 'react';
import { useProductStore } from '../../stores/productStore';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

const Products = () => {
    const navigate = useNavigate();
    const { products, pagination, loading, getProducts } = useProductStore();
    const { addToCart } = useCartStore();
    const { user } = useAuthStore();

    useEffect(() => {
        getProducts();
    }, [getProducts]);

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

                <div className="products-grid">
                    {products.map((product) => {
                        const priceNew = product.price * (100 - product.discountPercentage) / 100;

                        return (
                            <div key={product._id} className="product-card">
                                <div className="product-image">
                                    <img src={product.thumbnail} alt={product.title} />
                                    {product.discountPercentage > 0 && (
                                        <span className="discount-badge">-{product.discountPercentage}%</span>
                                    )}
                                </div>

                                <div className="product-info">
                                    <h3 className="product-title">{product.title}</h3>

                                    <div className="product-price">
                                        {product.discountPercentage > 0 && (
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
                                            onClick={() => handleAddToCart(product._id)}
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
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                className={`page-btn ${page === pagination.currentPage ? 'active' : ''}`}
                                onClick={() => getProducts({ page })}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Products;
