import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../stores/cartStore';
import { useOrderStore } from '../../stores/orderStore';
import { useAuthStore } from '../../stores/authStore';

const Checkout = () => {
    const navigate = useNavigate();
    const { cart, selectedItems, getSelectedTotal, getCart } = useCartStore();
    const { checkout, loading } = useOrderStore();
    const { user } = useAuthStore();

    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        phone: user?.phone || '',
        address: user?.address || '',
        paymentMethod: 'COD'
    });

    useEffect(() => {
        getCart();
    }, [getCart]);

    // Redirect if no items selected
    useEffect(() => {
        if (selectedItems.length === 0 && !loading) {
            navigate('/cart');
        }
    }, [selectedItems, navigate, loading]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.fullName || !formData.phone || !formData.address) {
            return;
        }

        try {
            const order = await checkout(
                {
                    fullName: formData.fullName,
                    phone: formData.phone,
                    address: formData.address
                },
                formData.paymentMethod
            );

            // If VNPay, user will be redirected, order will be null
            if (order && order.id) {
                navigate('/');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price || 0);
    };

    // Filter only selected items
    const selectedCartItems = cart.filter(item => selectedItems.includes(item.id));

    // Group selected items by store
    const groupedByStore = selectedCartItems.reduce((acc, item) => {
        const storeId = item.store.id;
        if (!acc[storeId]) {
            acc[storeId] = {
                store: item.store,
                items: []
            };
        }
        acc[storeId].items.push(item);
        return acc;
    }, {});

    const selectedTotal = getSelectedTotal();

    if (selectedItems.length === 0) {
        return null;
    }

    return (
        <div className="checkout-page">
            <div className="container">
                <h1 className="page-title">Thanh Toán</h1>

                <div className="checkout-content">


                    <div className="checkout-summary-section">
                        <div className="checkout-card">
                            <div className="card-header-with-action">
                                <h2>Đơn hàng của bạn</h2>
                                <button
                                    type="button"
                                    className="btn-edit-cart"
                                    onClick={() => navigate('/cart')}
                                >
                                    Chỉnh sửa
                                </button>
                            </div>

                            {/* Group items by store */}
                            {Object.values(groupedByStore).map((group) => {
                                // Calculate store subtotal
                                const storeSubtotal = group.items.reduce((total, item) => {
                                    const currentPrice = Math.round(item.product.price * (100 - (item.product.discount_percentage || 0)) / 100);
                                    return total + (currentPrice * item.quantity);
                                }, 0);

                                return (
                                    <div key={group.store.id} style={{ marginBottom: '30px' }}>
                                        {/* Store Header */}
                                        <div style={{
                                            background: '#f8f9fa',
                                            padding: '12px 16px',
                                            borderRadius: '8px',
                                            marginBottom: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            borderLeft: '4px solid #3498db'
                                        }}>
                                            <i className="fa-solid fa-shop" style={{ color: '#3498db' }}></i>
                                            <span style={{ fontWeight: '600', fontSize: '15px' }}>{group.store.name}</span>
                                            <span style={{ color: '#6c757d', fontSize: '13px' }}>({group.items.length} sản phẩm)</span>
                                        </div>

                                        {/* Store Items */}
                                        <div className="checkout-items">
                                            {group.items.map((item) => {
                                                const currentPrice = Math.round(item.product.price * (100 - (item.product.discount_percentage || 0)) / 100);
                                                const itemTotal = currentPrice * item.quantity;

                                                return (
                                                    <div key={item.id} className="checkout-item">
                                                        <img src={item.product.thumbnail} alt={item.product.title} />
                                                        <div className="checkout-item-info">
                                                            <h4>{item.product.title}</h4>
                                                            <p>Số lượng: {item.quantity}</p>
                                                            <p style={{ fontSize: '13px', color: '#6c757d' }}>
                                                                {formatPrice(currentPrice)} x {item.quantity}
                                                            </p>
                                                        </div>
                                                        <div className="checkout-item-price">
                                                            {formatPrice(itemTotal)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Store Subtotal & Shipping */}
                                        <div style={{
                                            padding: '12px 16px',
                                            background: '#f8f9fa',
                                            borderRadius: '8px',
                                            marginTop: '12px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                                                <span style={{ color: '#6c757d' }}>Tạm tính ({group.store.name}):</span>
                                                <span style={{ fontWeight: '600' }}>{formatPrice(storeSubtotal)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                                <span style={{ color: '#6c757d' }}>Phí vận chuyển:</span>
                                                <span style={{ color: '#27ae60', fontWeight: '600' }}>Miễn phí</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Overall Summary */}
                            <div className="checkout-summary" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #dee2e6' }}>
                                <div className="summary-row">
                                    <span>Tổng tạm tính:</span>
                                    <span>{formatPrice(selectedTotal)}</span>
                                </div>
                                <div className="summary-row">
                                    <span>Tổng phí vận chuyển:</span>
                                    <span style={{ color: '#27ae60' }}>Miễn phí</span>
                                </div>
                                <div className="summary-total">
                                    <span>Tổng cộng:</span>
                                    <span>{formatPrice(selectedTotal)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="checkout-form-section">
                        <div className="checkout-card">
                            <h2>Thông tin giao hàng</h2>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label htmlFor="fullName">Họ và tên *</label>
                                    <input
                                        type="text"
                                        id="fullName"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        placeholder="Nhập họ và tên"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="phone">Số điện thoại *</label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="Nhập số điện thoại"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="address">Địa chỉ giao hàng *</label>
                                    <textarea
                                        id="address"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Nhập địa chỉ chi tiết"
                                        rows="3"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Phương thức thanh toán</label>
                                    <div className="payment-methods">
                                        <label className="payment-option">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="COD"
                                                checked={formData.paymentMethod === 'COD'}
                                                onChange={handleChange}
                                            />
                                            <span>💵 Thanh toán khi nhận hàng (COD)</span>
                                        </label>
                                        <label className="payment-option">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="VNPay"
                                                checked={formData.paymentMethod === 'VNPay'}
                                                onChange={handleChange}
                                            />
                                            <span>💳 VNPay</span>
                                        </label>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="btn-place-order"
                                    disabled={loading}
                                >
                                    {loading ? 'Đang xử lý...' : 'Đặt hàng'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
