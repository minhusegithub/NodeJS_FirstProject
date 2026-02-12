import { useEffect, useState } from 'react';
import { useAdminOrderStore } from '/src/stores/admin/orderStore.js';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import '../../assets/styles/admin-orders.css';

const AdminOrders = () => {
    const navigate = useNavigate();
    const { orders, pagination, loading, getOrders, updateStatus } = useAdminOrderStore();
    const [filters, setFilters] = useState({
        keyword: '',
        status: '',
        page: 1
    });

    useEffect(() => {
        getOrders(filters);
    }, [filters, getOrders]);

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await updateStatus(id, newStatus);
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

    const getPaymentStatusText = (paymentStatus) => {
        const statusMap = {
            pending: 'Chưa thanh toán',
            paid: 'Đã thanh toán',
            failed: 'Thanh toán thất bại'
        };
        return statusMap[paymentStatus] || paymentStatus;
    };

    return (
        <div className="admin-orders">
            <div className="container">
                <h1 className="admin-page-title">Quản lý Đơn hàng Cửa hàng</h1>

                {/* Filters */}
                <div className="admin-filters">
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo mã đơn, tên, SĐT, email..."
                        value={filters.keyword}
                        onChange={(e) => setFilters({ ...filters, keyword: e.target.value, page: 1 })}
                        className="filter-input"
                    />
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                        className="filter-select"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="pending">Chờ xác nhận</option>
                        <option value="confirmed">Đã xác nhận</option>
                        <option value="shipping">Đang giao</option>
                        <option value="delivered">Đã giao</option>
                        <option value="cancelled">Đã hủy</option>
                    </select>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                    </div>
                ) : (
                    <>
                        {/* Orders Table */}
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Mã đơn</th>
                                        <th>Khách hàng</th>
                                        <th>Sản phẩm</th>

                                        <th>Tổng tiền</th>
                                        <th>Trạng thái</th>
                                        <th>Thanh toán</th>
                                        <th>Ngày đặt</th>

                                    </tr>
                                </thead>
                                <tbody>
                                    {orders && orders.length > 0 ? (
                                        orders.map((order) => (
                                            <tr key={order.id}>
                                                <td>
                                                    <strong>{order.code}</strong>
                                                </td>
                                                <td>
                                                    <div>
                                                        <strong>{order.user_info?.fullName || order.user?.full_name || 'N/A'}</strong>
                                                        <p className="text-small">{order.user_info?.phone || order.user?.phone || 'N/A'}</p>
                                                        <p className="text-small text-muted">{order.user_info?.email || order.user?.email || ''}</p>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="order-items-mini">
                                                        {order.items && order.items.slice(0, 2).map((item, idx) => (
                                                            <div key={idx} className="item-mini">
                                                                {item.thumbnail && (
                                                                    <img src={item.thumbnail} alt={item.title} />
                                                                )}
                                                                <span>{item.title}</span>
                                                                <span className="qty">x{item.quantity}</span>
                                                            </div>
                                                        ))}
                                                        {order.items && order.items.length > 2 && (
                                                            <span className="more-items">+{order.items.length - 2} sản phẩm</span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td>
                                                    <strong className="price-highlight">{formatPrice(order.total_price)}</strong>
                                                </td>
                                                <td>
                                                    <select
                                                        value={order.status}
                                                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                                                        className={`status-select status-${order.status}`}
                                                    >
                                                        <option value="pending">Chờ xác nhận</option>
                                                        <option value="confirmed">Đã xác nhận</option>
                                                        <option value="shipping">Đang giao</option>
                                                        <option value="delivered">Đã giao</option>
                                                        <option value="cancelled">Đã hủy</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <span className={`payment-badge payment-${order.payment_status}`}>
                                                        {getPaymentStatusText(order.payment_status)}
                                                    </span>
                                                    <br />
                                                    <small>{order.payment_method === 'VNPay' ? 'VNPay' : 'COD'}</small>
                                                </td>
                                                <td>{moment(order.created_at).format('DD/MM/YYYY HH:mm')}</td>

                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="9" className="text-center">
                                                Không có đơn hàng nào
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="pagination">
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        className={`page-btn ${page === pagination.page ? 'active' : ''}`}
                                        onClick={() => setFilters({ ...filters, page })}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminOrders;
