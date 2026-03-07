import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProductStore } from '../../stores/productStore';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import StoreSelectionModal from '../../components/StoreSelectionModal';
import '../../assets/styles/product-detail.css';

const ProductDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { currentProduct, loading, getProductBySlug, clearCurrentProduct } = useProductStore();
    const { addToCart } = useCartStore();
    const { user } = useAuthStore();
    const [quantity, setQuantity] = useState(1);
    const [showStoreModal, setShowStoreModal] = useState(false);

    useEffect(() => {
        console.log('🔍 ProductDetail mounted, slug:', slug);
        getProductBySlug(slug);
        return () => clearCurrentProduct();
    }, [slug, getProductBySlug, clearCurrentProduct]);

    const handleAddToCartClick = () => {
        console.log('🛒 Add to cart clicked');
        console.log('User:', user);
        console.log('Current product:', currentProduct);
        console.log('Inventory:', currentProduct?.inventory);

        if (!user) {
            console.log('❌ User not logged in, redirecting...');
            navigate('/login');
            return;
        }

        if (!currentProduct?.inventory || currentProduct.inventory.length === 0) {
            alert('Sản phẩm hiện không có sẵn tại cửa hàng nào!');
            return;
        }

        console.log('✅ Opening store modal...');
        // Show modal to select store
        setShowStoreModal(true);
    };

    const handleStoreConfirm = async (inventoryId) => {
        try {
            await addToCart(inventoryId, quantity);
            setShowStoreModal(false);
            setQuantity(1); // Reset quantity
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

    const getTotalStock = () => {
        if (!currentProduct?.inventory) return 0;
        return currentProduct.inventory.reduce((sum, inv) => sum + inv.stock, 0);
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

    const priceNew = currentProduct.price * (100 - (currentProduct.discount_percentage || 0)) / 100;
    const totalStock = getTotalStock();

    return (
        <div className="product-detail-page">
            <div className="container">
                <button className="btn-back" onClick={() => navigate('/products')}>
                    ← Quay lại
                </button>

                <div className="product-detail">
                    <div className="product-image-large">
                        <img src={currentProduct.thumbnail} alt={currentProduct.title} />
                        {currentProduct.discount_percentage > 0 && (
                            <span className="discount-badge">-{currentProduct.discount_percentage}%</span>
                        )}
                        {currentProduct.featured && (
                            <span className="featured-badge">⭐ Nổi bật</span>
                        )}
                    </div>

                    <div className="product-detail-info">
                        <h1>{currentProduct.title}</h1>

                        {/* Product Meta Info */}
                        <div className="product-meta">
                            {currentProduct.brand && (
                                <div className="meta-item">
                                    <strong> Thương hiệu:</strong> {currentProduct.brand}
                                </div>
                            )}
                            {currentProduct.sku && (
                                <div className="meta-item">
                                    <strong> SKU:</strong> {currentProduct.sku}
                                </div>
                            )}
                            {currentProduct.weight && (
                                <div className="meta-item">
                                    <strong> Khối lượng:</strong> {currentProduct.weight}g
                                </div>
                            )}
                            {currentProduct.category && (
                                <div className="meta-item">
                                    <strong>Danh mục:</strong> {currentProduct.category.title}
                                </div>
                            )}
                        </div>

                        <div className="product-price-large">
                            {currentProduct.discount_percentage > 0 && (
                                <span className="price-old">{formatPrice(currentProduct.price)}</span>
                            )}
                            <span className="price-new">{formatPrice(priceNew)}</span>
                        </div>

                        <div className="product-stock">
                            <span className={totalStock > 0 ? 'in-stock' : 'out-of-stock'}>
                                {totalStock > 0 ? `Còn ${totalStock} sản phẩm` : 'Hết hàng'}
                            </span>
                        </div>

                        {/* Description */}
                        {currentProduct.description && (
                            <div className="product-description">
                                <h3> Mô tả sản phẩm</h3>
                                <p>{currentProduct.description}</p>
                            </div>
                        )}

                        {/* Available Stores */}
                        {currentProduct.inventory && currentProduct.inventory.length > 0 && (
                            <div className="product-stores">
                                <h3> Cửa hàng có bán</h3>
                                <div className="stores-list">
                                    {currentProduct.inventory.map((inv) => (
                                        <div key={inv.id} className="store-item">
                                            <div className="store-info">
                                                <h4>{inv.store.name}</h4>
                                                <p className="store-address">
                                                    {typeof inv.store.address === 'object'
                                                        ? `${inv.store.address.street || ''}, ${inv.store.address.district || ''}, ${inv.store.address.city || ''}`.trim().replace(/, ,/g, ',').replace(/^, |, $/g, '')
                                                        : (inv.store.address || 'Chưa có địa chỉ')}
                                                </p>
                                                {inv.store.contact && (
                                                    <p className="store-contact">
                                                        {typeof inv.store.contact === 'object'
                                                            ? (inv.store.contact.phone || inv.store.contact.email || 'N/A')
                                                            : inv.store.contact}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="store-stock">
                                                <span className={inv.stock > 0 ? 'stock-available' : 'stock-out'}>
                                                    {inv.stock > 0 ? `${inv.stock} sản phẩm` : 'Hết hàng'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Add to Cart */}
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
                                    max={totalStock}
                                />
                                <button
                                    onClick={() => setQuantity(Math.min(totalStock, quantity + 1))}
                                    disabled={quantity >= totalStock}
                                >
                                    +
                                </button>
                            </div>

                            <button
                                className="btn-add-cart-large"
                                onClick={handleAddToCartClick}
                                disabled={totalStock === 0}
                            >
                                🛒 Thêm vào giỏ hàng
                            </button>
                        </div>
                    </div>
                </div>

                {/* Store Selection Modal */}
                {showStoreModal && currentProduct && (
                    <StoreSelectionModal
                        product={currentProduct}
                        onClose={() => setShowStoreModal(false)}
                        onConfirm={handleStoreConfirm}
                    />
                )}
            </div>
        </div>
    );
};

export default ProductDetail;
