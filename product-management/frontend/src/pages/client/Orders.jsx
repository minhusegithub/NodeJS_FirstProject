import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../stores/orderStore';
import moment from 'moment';

const Orders = () => {
    const navigate = useNavigate();
    const { orders, pagination, loading, getOrders, cancelOrder } = useOrderStore();
    const [cancellingId, setCancellingId] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState('all');

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

    const getPaymentStatusText = (paymentStatus) => {
        const statusMap = {
            pending: 'Chưa thanh toán',
            paid: 'Đã thanh toán',
            failed: 'Thanh toán thất bại'
        };
        return statusMap[paymentStatus] || paymentStatus;
    };

    // Lọc đơn hàng theo trạng thái
    const filteredOrders = selectedStatus === 'all'
        ? orders
        : orders.filter(order => order.status === selectedStatus);

    const canCancel = (status) => ['pending', 'confirmed'].includes(status);

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này không?')) return;
        setCancellingId(orderId);
        try {
            await cancelOrder(orderId);
        } finally {
            setCancellingId(null);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Đang tải đơn hàng...</p>
            </div>
        );
    }

    if (!orders || orders.length === 0) {
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

                {/* Nút lọc trạng thái */}
                <div className="order-status-filters">
                    <button
                        className={`filter-btn ${selectedStatus === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedStatus('all')}
                    >
                        Tất cả
                    </button>
                    <button
                        className={`filter-btn ${selectedStatus === 'pending' ? 'active' : ''}`}
                        onClick={() => setSelectedStatus('pending')}
                    >
                        Chờ xác nhận
                    </button>
                    <button
                        className={`filter-btn ${selectedStatus === 'confirmed' ? 'active' : ''}`}
                        onClick={() => setSelectedStatus('confirmed')}
                    >
                        Đã xác nhận
                    </button>
                    <button
                        className={`filter-btn ${selectedStatus === 'shipping' ? 'active' : ''}`}
                        onClick={() => setSelectedStatus('shipping')}
                    >
                        Đang giao
                    </button>
                    <button
                        className={`filter-btn ${selectedStatus === 'delivered' ? 'active' : ''}`}
                        onClick={() => setSelectedStatus('delivered')}
                    >
                        Đã giao
                    </button>
                    <button
                        className={`filter-btn ${selectedStatus === 'cancelled' ? 'active' : ''}`}
                        onClick={() => setSelectedStatus('cancelled')}
                    >
                        Đã hủy
                    </button>
                </div>

                <div className="orders-table-container">
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Ngày đặt</th>
                                <th>Sản phẩm</th>
                                <th>Cửa hàng</th>
                                <th>Tổng tiền</th>
                                <th>Trạng thái</th>
                                <th>Thanh toán</th>
                                <th>Thao tác</th>

                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map((order) => (
                                <tr key={order.id}>
                                    <td>
                                        <strong>{order.code}</strong>
                                    </td>
                                    <td>
                                        {moment(order.created_at).format('DD/MM/YYYY HH:mm')}
                                    </td>
                                    <td>
                                        <div className="order-items-preview">
                                            {order.items && order.items.slice(0, 2).map((item, index) => (
                                                <div key={index} className="order-item-mini">
                                                    {item.thumbnail && (
                                                        <img src={item.thumbnail} alt={item.title} />
                                                    )}
                                                    <span>{item.title}</span>
                                                    <span className="item-qty">x{item.quantity}</span>
                                                </div>
                                            ))}
                                            {order.items && order.items.length > 2 && (
                                                <span className="more-items">+{order.items.length - 2} sản phẩm</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {order.store?.name || 'N/A'}
                                    </td>
                                    <td>
                                        <strong className="order-total-price">
                                            {formatPrice(order.total_price)}
                                        </strong>
                                    </td>
                                    <td>
                                        <span className={`order-status-badge ${getStatusClass(order.status)}`}>
                                            {getStatusText(order.status)}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`payment-status ${order.payment_status}`}>
                                            {getPaymentStatusText(order.payment_status)}
                                        </span>
                                        <br />
                                        <small>{order.payment_method === 'VNPay' ? 'VNPay' : 'COD'}</small>
                                    </td>
                                    <td>
                                        {canCancel(order.status) ? (
                                            <button
                                                onClick={() => handleCancelOrder(order.id)}
                                                disabled={cancellingId === order.id}
                                                style={{
                                                    background: 'none',
                                                    border: '1px solid #e74c3c',
                                                    color: '#e74c3c',
                                                    padding: '5px 12px',
                                                    borderRadius: '6px',
                                                    cursor: cancellingId === order.id ? 'not-allowed' : 'pointer',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    opacity: cancellingId === order.id ? 0.6 : 1,
                                                    transition: 'all 0.2s',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                onMouseEnter={e => { if (cancellingId !== order.id) { e.target.style.background = '#e74c3c'; e.target.style.color = '#fff'; } }}
                                                onMouseLeave={e => { e.target.style.background = 'none'; e.target.style.color = '#e74c3c'; }}
                                            >
                                                {cancellingId === order.id ? 'Đang hủy...' : 'Hủy đơn'}
                                            </button>
                                        ) : (
                                            <span style={{ color: '#aaa', fontSize: '12px' }}>————</span>
                                        )}
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {pagination && pagination.totalPages > 1 && (
                    <div className="pagination">
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                className={`page-btn ${page === pagination.page ? 'active' : ''}`}
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
