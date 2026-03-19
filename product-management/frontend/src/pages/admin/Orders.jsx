import { useEffect, useState, useRef } from 'react';
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
        page: 1,
        limit: 6
    });
    const debounceTimerRef = useRef(null);
    const prevSearchRef = useRef({ keyword: '', status: '' });

    // Debounce chỉ cho keyword và status (tìm kiếm / lọc)
    useEffect(() => {
        const prevSearch = prevSearchRef.current;
        const searchChanged = filters.keyword !== prevSearch.keyword || filters.status !== prevSearch.status;

        if (searchChanged) {
            // Cập nhật ref
            prevSearchRef.current = { keyword: filters.keyword, status: filters.status };

            // Debounce 1 giây khi tìm kiếm/lọc
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
                getOrders(filters);
            }, 1000);

            return () => {
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            };
        }
    }, [filters.keyword, filters.status]);

    // Gọi ngay khi chuyển trang (không debounce)
    useEffect(() => {
        // Hủy debounce đang chờ (nếu có) để tránh gọi API 2 lần
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        getOrders(filters);
    }, [filters.page]);

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
            cancelled_no_refund: 'Đã hủy - không hoàn tiền',
            cancelled_refund: 'Đã hủy - cần hoàn tiền'
        };
        return statusMap[status] || status;
    };

    const isOrderLocked = (orderStatus) => {
        return orderStatus === 'delivered' || orderStatus === 'cancelled_no_refund' || orderStatus === 'cancelled_refund';
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
                        <option value="cancelled_no_refund">Đã hủy - không hoàn tiền</option>
                        <option value="cancelled_refund">Đã hủy - cần hoàn tiền</option>
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
                                        <th className="hide-on-mobile">Sản phẩm</th>
                                        <th>Tổng tiền</th>
                                        <th>Trạng thái</th>
                                        <th>Thanh toán</th>
                                        <th>Lịch sử cập nhật</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders && orders.length > 0 ? (
                                        orders.map((order) => (
                                            <tr key={order.id}>
                                                <td>
                                                    <span className="order-code">{order.code}</span>
                                                </td>
                                                <td>
                                                    <div className="customer-name">{order.user_info?.fullName || order.user?.full_name || 'N/A'}</div>
                                                    <p className="text-small">{order.user_info?.phone || order.user?.phone || 'N/A'}</p>
                                                    <p className="text-small text-muted">{order.user_info?.email || order.user?.email || ''}</p>
                                                </td>
                                                <td className="hide-on-mobile">
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
                                                            <span className="more-items">+{order.items.length - 2} mục</span>
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
                                                        disabled={isOrderLocked(order.status)}
                                                        className={`status-select status-${order.status} ${isOrderLocked(order.status) ? 'is-disabled' : ''}`}
                                                    >
                                                        <option value="pending">Chờ xác nhận</option>
                                                        <option value="confirmed">Đã xác nhận</option>
                                                        <option value="shipping">Đang giao</option>
                                                        <option value="delivered">Đã giao</option>
                                                        <option value="cancelled_no_refund">Đã hủy - không hoàn tiền</option>
                                                        <option value="cancelled_refund">Đã hủy - cần hoàn tiền</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <span className={`payment-badge payment-${order.payment_status}`}>
                                                        {getPaymentStatusText(order.payment_status)}
                                                    </span>
                                                    <div className="payment-method">{order.payment_method === 'VNPay' ? 'VNPay' : 'COD'}</div>
                                                </td>
                                                <td>
                                                    <div className="text-small">Tạo: {moment(order.created_at).format('DD/MM/YYYY HH:mm')}</div>
                                                    <div className="text-small text-muted">Cập nhật: {moment(order.updated_at).format('DD/MM/YYYY HH:mm')}</div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="text-center">
                                                Không có đơn hàng nào
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (() => {
                            const currentPage = pagination.page;
                            const totalPages = pagination.totalPages;

                            // Tính 3 nút số: [prev, current, next]
                            let pageNumbers = [];
                            if (totalPages <= 3) {
                                // Ít hơn hoặc bằng 3 trang thì hiện hết
                                pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
                            } else if (currentPage === 1) {
                                pageNumbers = [1, 2, 3];
                            } else if (currentPage === totalPages) {
                                pageNumbers = [totalPages - 2, totalPages - 1, totalPages];
                            } else {
                                pageNumbers = [currentPage - 1, currentPage, currentPage + 1];
                            }

                            const goToPage = (p) => setFilters({ ...filters, page: p });

                            return (
                                <div className="pagination">
                                    {/* Nút về trang đầu */}
                                    <button
                                        className="page-btn page-nav"
                                        onClick={() => goToPage(1)}
                                        disabled={currentPage === 1}
                                        title="Trang đầu"
                                    >
                                        &laquo;
                                    </button>

                                    {/* Nút về trang trước */}
                                    <button
                                        className="page-btn page-nav"
                                        onClick={() => goToPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        title="Trang trước"
                                    >
                                        &lsaquo;
                                    </button>

                                    {/* 3 nút số trang */}
                                    {pageNumbers.map((p) => (
                                        <button
                                            key={p}
                                            className={`page-btn ${p === currentPage ? 'active' : ''}`}
                                            onClick={() => goToPage(p)}
                                        >
                                            {p}
                                        </button>
                                    ))}

                                    {/* Nút đến trang tiếp theo */}
                                    <button
                                        className="page-btn page-nav"
                                        onClick={() => goToPage(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        title="Trang tiếp"
                                    >
                                        &rsaquo;
                                    </button>

                                    {/* Nút về trang cuối */}
                                    <button
                                        className="page-btn page-nav"
                                        onClick={() => goToPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                        title="Trang cuối"
                                    >
                                        &raquo;
                                    </button>
                                </div>
                            );
                        })()}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminOrders;
