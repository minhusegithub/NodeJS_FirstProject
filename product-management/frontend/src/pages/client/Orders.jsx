import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../stores/orderStore';
import moment from 'moment';

const Orders = () => {
    const navigate = useNavigate();
    const { orders, pagination, loading, getOrders } = useOrderStore();

    useEffect(() => {
        getOrders();
    }, [getOrders]);

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

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Đang tải đơn hàng...</p>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="orders-empty">
                <div className="container">
                    <h1>Chưa có đơn hàng</h1>
                    <p>Bạn chưa có đơn hàng nào</p>
                    <button className="btn-primary" onClick={() => navigate('/products')}>
                        Tiếp tục mua sắm
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="orders-page">
            <div className="container">
                <h1 className="page-title">Đơn Hàng Của Tôi</h1>

                <div className="orders-list">
                    {orders.map((order) => (
                        <div key={order._id} className="order-card">
                            <div className="order-header">
                                <div className="order-id">
                                    <strong>Mã đơn:</strong> #{order._id.slice(-8).toUpperCase()}
                                </div>
                                <div className={`order-status ${getStatusClass(order.status)}`}>
                                    {getStatusText(order.status)}
                                </div>
                            </div>

                            <div className="order-date">
                                <span>📅 {moment(order.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                            </div>

                            <div className="order-products">
                                {order.products.map((item, index) => (
                                    <div key={index} className="order-product-item">
                                        <img src={item.thumbnail} alt={item.title} />
                                        <div className="order-product-info">
                                            <h4>{item.title}</h4>
                                            <p>Số lượng: {item.quantity}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="order-footer">
                                <div className="order-total">
                                    <strong>Tổng tiền:</strong> {formatPrice(order.totalPrice)}
                                </div>
                                <button
                                    className="btn-view-detail"
                                    onClick={() => navigate(`/orders/${order._id}`)}
                                >
                                    Xem chi tiết
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {pagination && pagination.totalPages > 1 && (
                    <div className="pagination">
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                className={`page-btn ${page === pagination.currentPage ? 'active' : ''}`}
                                onClick={() => getOrders({ page })}
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

export default Orders;
