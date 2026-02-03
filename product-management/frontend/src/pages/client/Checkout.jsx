import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../stores/cartStore';
import { useOrderStore } from '../../stores/orderStore';
import { useAuthStore } from '../../stores/authStore';

const Checkout = () => {
    const navigate = useNavigate();
    const { cart, totalPrice, getCart } = useCartStore();
    const { checkout, loading } = useOrderStore();
    const { user } = useAuthStore();

    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        phone: user?.phone || '',
        address: '',
        paymentMethod: 'COD'
    });

    useEffect(() => {
        getCart();
    }, [getCart]);

    useEffect(() => {
        if (cart.length === 0 && !loading) {
            navigate('/cart');
        }
    }, [cart, navigate, loading]);

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
            navigate(`/orders/${order._id}`);
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

    if (cart.length === 0) {
        return null;
    }

    return (
        <div className="checkout-page">
            <div className="container">
                <h1 className="page-title">Thanh Toán</h1>

                <div className="checkout-content">
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

                            <div className="checkout-items">
                                {cart.map((item) => (
                                    <div key={item.product_id} className="checkout-item">
                                        <img src={item.thumbnail} alt={item.title} />
                                        <div className="checkout-item-info">
                                            <h4>{item.title}</h4>
                                            <p>Số lượng: {item.quantity}</p>
                                        </div>
                                        <div className="checkout-item-price">
                                            {formatPrice(item.totalPrice)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="checkout-summary">
                                <div className="summary-row">
                                    <span>Tạm tính:</span>
                                    <span>{formatPrice(totalPrice)}</span>
                                </div>
                                <div className="summary-row">
                                    <span>Phí vận chuyển:</span>
                                    <span>Miễn phí</span>
                                </div>
                                <div className="summary-total">
                                    <span>Tổng cộng:</span>
                                    <span>{formatPrice(totalPrice)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
