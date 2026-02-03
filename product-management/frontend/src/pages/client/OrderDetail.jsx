import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../stores/orderStore';
import moment from 'moment';

const OrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentOrder, loading, getOrderDetail, cancelOrder, clearCurrentOrder } = useOrderStore();

    useEffect(() => {
        getOrderDetail(id);
        return () => clearCurrentOrder();
    }, [id, getOrderDetail, clearCurrentOrder]);

    const handleCancelOrder = async () => {
        if (window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) {
            try {
                await cancelOrder(id);
                await getOrderDetail(id); // Refresh order detail
            } catch (error) {
                console.error(error);
            }
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    };

    const getStatusText = (status) => {
        const statusMap = {
            pending: 'Chờ xác nhận',
            confirmed: 'Đã xác nhận',
            shipping: 'Đang giao',
            delivered: 'Đã giao',
            cancelled: 'Đã hủy'
        };
        return statusMap[status] || status;
    };

    const getStatusClass = (status) => {
        const classMap = {
            pending: 'status-pending',
            confirmed: 'status-confirmed',
            shipping: 'status-shipping',
            delivered: 'status-delivered',
            cancelled: 'status-cancelled'
        };
        return classMap[status] || '';
    };

    const getPaymentMethodText = (method) => {
        return method === 'COD' ? 'Thanh toán khi nhận hàng' : 'VNPay';
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Đang tải...</p>
            </div>
        );
    }

    if (!currentOrder) {
        return (
            <div className="container">
                <p>Không tìm thấy đơn hàng</p>
            </div>
        );
    }

    return (
        <div className="order-detail-page">
            <div className="container">
                <button className="btn-back" onClick={() => navigate('/orders')}>
                    ← Quay lại
                </button>

                <div className="order-detail-header">
                    <h1>Chi Tiết Đơn Hàng</h1>
                    <div className={`order-status-large ${getStatusClass(currentOrder.status)}`}>
                        {getStatusText(currentOrder.status)}
                    </div>
                </div>

                <div className="order-detail-content">
                    <div className="order-info-section">
                        <div className="info-card">
                            <h3>Thông tin đơn hàng</h3>
                            <div className="info-row">
                                <span className="info-label">Mã đơn hàng:</span>
                                <span className="info-value">#{currentOrder._id.slice(-8).toUpperCase()}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Ngày đặt:</span>
                                <span className="info-value">
                                    {moment(currentOrder.createdAt).format('DD/MM/YYYY HH:mm')}
                                </span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Phương thức thanh toán:</span>
                                <span className="info-value">
                                    {getPaymentMethodText(currentOrder.paymentMethod)}
                                </span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Trạng thái thanh toán:</span>
                                <span className="info-value">
                                    {currentOrder.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                </span>
                            </div>
                        </div>

                        <div className="info-card">
                            <h3>Thông tin người nhận</h3>
                            <div className="info-row">
                                <span className="info-label">Họ tên:</span>
                                <span className="info-value">{currentOrder.userInfo.fullName}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Số điện thoại:</span>
                                <span className="info-value">{currentOrder.userInfo.phone}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Email:</span>
                                <span className="info-value">{currentOrder.userInfo.email}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Địa chỉ:</span>
                                <span className="info-value">{currentOrder.userInfo.address}</span>
                            </div>
                        </div>
                    </div>

                    <div className="order-products-section">
                        <div className="info-card">
                            <h3>Sản phẩm</h3>
                            <div className="order-detail-products">
                                {currentOrder.products.map((item, index) => {
                                    // Use snapshot data (priceNew and totalPrice already saved)
                                    const priceNew = item.priceNew || (item.price * (100 - item.discountPercentage) / 100);
                                    const itemTotal = item.totalPrice || (priceNew * item.quantity);

                                    return (
                                        <div key={index} className="order-detail-product">
                                            <img src={item.thumbnail} alt={item.title} />
                                            <div className="product-detail-info">
                                                <h4>{item.title}</h4>
                                                <p className="product-price-detail">
                                                    {formatPrice(priceNew)} x {item.quantity}
                                                </p>
                                            </div>
                                            <div className="product-total">
                                                {formatPrice(itemTotal)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="order-detail-summary">
                                <div className="summary-row">
                                    <span>Tạm tính:</span>
                                    <span>{formatPrice(currentOrder.totalPrice)}</span>
                                </div>
                                <div className="summary-row">
                                    <span>Phí vận chuyển:</span>
                                    <span>Miễn phí</span>
                                </div>
                                <div className="summary-total">
                                    <span>Tổng cộng:</span>
                                    <span>{formatPrice(currentOrder.totalPrice)}</span>
                                </div>
                            </div>

                            {currentOrder.status === 'pending' && (
                                <button
                                    className="btn-cancel-order"
                                    onClick={handleCancelOrder}
                                >
                                    Hủy đơn hàng
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetail;
