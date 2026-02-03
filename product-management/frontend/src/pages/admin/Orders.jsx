import { useEffect, useState } from 'react';
import { useAdminOrderStore } from '/src/stores/admin/orderStore.js';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';

const AdminOrders = () => {
    const navigate = useNavigate();
    const { orders, pagination, loading, getOrders, updateStatus, deleteOrder } = useAdminOrderStore();
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

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc muốn xóa đơn hàng này?')) {
            try {
                await deleteOrder(id);
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

    return (
        <div className="admin-orders">
            <div className="container">
                <h1 className="admin-page-title">Quản lý Đơn hàng</h1>

                {/* Filters */}
                <div className="admin-filters">
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên, SĐT, email..."
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
                                        <th>Tổng tiền</th>
                                        <th>Trạng thái</th>
                                        <th>Ngày đặt</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order) => (
                                        <tr key={order._id}>
                                            <td>
                                                <strong>#{order._id.slice(-8).toUpperCase()}</strong>
                                            </td>
                                            <td>
                                                <div>
                                                    <strong>{order.userInfo.fullName}</strong>
                                                    <p className="text-small">{order.userInfo.phone}</p>
                                                </div>
                                            </td>
                                            <td>{formatPrice(order.totalPrice)}</td>
                                            <td>
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                                                    className={`status-select status-${order.status}`}
                                                >
                                                    <option value="pending">Chờ xác nhận</option>
                                                    <option value="confirmed">Đã xác nhận</option>
                                                    <option value="shipping">Đang giao</option>
                                                    <option value="delivered">Đã giao</option>
                                                    <option value="cancelled">Đã hủy</option>
                                                </select>
                                            </td>
                                            <td>{moment(order.createdAt).format('DD/MM/YYYY HH:mm')}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="btn-view"
                                                        onClick={() => navigate(`/admin/orders/${order._id}`)}
                                                    >
                                                        👁️
                                                    </button>
                                                    <button
                                                        className="btn-delete"
                                                        onClick={() => handleDelete(order._id)}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="pagination">
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        className={`page-btn ${page === pagination.currentPage ? 'active' : ''}`}
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
