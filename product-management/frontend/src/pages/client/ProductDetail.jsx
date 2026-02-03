import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProductStore } from '../../stores/productStore';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { useState } from 'react';

const ProductDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { currentProduct, loading, getProductBySlug, clearCurrentProduct } = useProductStore();
    const { addToCart } = useCartStore();
    const { user } = useAuthStore();
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        getProductBySlug(slug);
        return () => clearCurrentProduct();
    }, [slug, getProductBySlug, clearCurrentProduct]);

    const handleAddToCart = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        try {
            await addToCart(currentProduct._id, quantity);
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
                <p>Đang tải...</p>
            </div>
        );
    }

    if (!currentProduct) {
        return (
            <div className="container">
                <p>Không tìm thấy sản phẩm</p>
            </div>
        );
    }

    const priceNew = currentProduct.price * (100 - currentProduct.discountPercentage) / 100;

    return (
        <div className="product-detail-page">
            <div className="container">
                <button className="btn-back" onClick={() => navigate('/products')}>
                    ← Quay lại
                </button>

                <div className="product-detail">
                    <div className="product-image-large">
                        <img src={currentProduct.thumbnail} alt={currentProduct.title} />
                        {currentProduct.discountPercentage > 0 && (
                            <span className="discount-badge">-{currentProduct.discountPercentage}%</span>
                        )}
                    </div>

                    <div className="product-detail-info">
                        <h1>{currentProduct.title}</h1>

                        <div className="product-price-large">
                            {currentProduct.discountPercentage > 0 && (
                                <span className="price-old">{formatPrice(currentProduct.price)}</span>
                            )}
                            <span className="price-new">{formatPrice(priceNew)}</span>
                        </div>

                        <div className="product-stock">
                            <span className={currentProduct.stock > 0 ? 'in-stock' : 'out-of-stock'}>
                                {currentProduct.stock > 0 ? `Còn ${currentProduct.stock} sản phẩm` : 'Hết hàng'}
                            </span>
                        </div>

                        <div className="product-description">
                            <h3>Mô tả sản phẩm</h3>
                            <div dangerouslySetInnerHTML={{ __html: currentProduct.description }} />
                        </div>

                        <div className="product-actions-detail">
                            <div className="quantity-selector">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    disabled={quantity <= 1}
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    min="1"
                                    max={currentProduct.stock}
                                />
                                <button
                                    onClick={() => setQuantity(Math.min(currentProduct.stock, quantity + 1))}
                                    disabled={quantity >= currentProduct.stock}
                                >
                                    +
                                </button>
                            </div>

                            <button
                                className="btn-add-cart-large"
                                onClick={handleAddToCart}
                                disabled={currentProduct.stock === 0}
                            >
                                🛒 Thêm vào giỏ hàng
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
