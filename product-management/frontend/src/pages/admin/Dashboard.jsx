import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminDashboardStore } from '/src/stores/admin/dashboardStore.js';
import moment from 'moment';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { statistics, loading, getStatistics } = useAdminDashboardStore();

    useEffect(() => {
        getStatistics();
    }, [getStatistics]);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    };

    if (loading || !statistics) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Đang tải...</p>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="container">
                <h1 className="admin-page-title">Dashboard</h1>

                {/* Statistics Cards */}
                <div className="stats-grid">
                    <div className="stat-card stat-primary">
                        <div className="stat-icon">📦</div>
                        <div className="stat-info">
                            <h3>Sản phẩm</h3>
                            <p className="stat-number">{statistics.products.total}</p>
                            <p className="stat-detail">
                                {statistics.products.active} hoạt động • {statistics.products.lowStock} sắp hết
                            </p>
                        </div>
                    </div>

                    <div className="stat-card stat-success">
                        <div className="stat-icon">🛒</div>
                        <div className="stat-info">
                            <h3>Đơn hàng</h3>
                            <p className="stat-number">{statistics.orders.total}</p>
                            <p className="stat-detail">
                                {statistics.orders.pending} chờ xử lý • {statistics.orders.delivered} đã giao
                            </p>
                        </div>
                    </div>

                    <div className="stat-card stat-warning">
                        <div className="stat-icon">💰</div>
                        <div className="stat-info">
                            <h3>Doanh thu</h3>
                            <p className="stat-number">{formatPrice(statistics.revenue.total)}</p>
                            <p className="stat-detail">Từ {statistics.orders.delivered} đơn hàng</p>
                        </div>
                    </div>

                    <div className="stat-card stat-info">
                        <div className="stat-icon">👥</div>
                        <div className="stat-info">
                            <h3>Người dùng</h3>
                            <p className="stat-number">{statistics.users.total}</p>
                            <p className="stat-detail">{statistics.users.active} đang hoạt động</p>
                        </div>
                    </div>
                </div>

                {/* Recent Orders & Top Products */}
                <div className="dashboard-content">
                    <div className="dashboard-section">
                        <div className="section-header">
                            <h2>Đơn hàng gần đây</h2>
                            <button className="btn-view-all" onClick={() => navigate('/admin/orders')}>
                                Xem tất cả →
                            </button>
                        </div>
                        <div className="recent-orders">
                            {statistics.recentOrders.map((order) => (
                                <div key={order._id} className="recent-order-item">
                                    <div className="order-info">
                                        <strong>#{order._id.slice(-8).toUpperCase()}</strong>
                                        <p>{order.userInfo.fullName}</p>
                                    </div>
                                    <div className="order-price">{formatPrice(order.totalPrice)}</div>
                                    <div className={`order-status status-${order.status}`}>
                                        {order.status}
                                    </div>
                                    <div className="order-date">
                                        {moment(order.createdAt).format('DD/MM/YYYY')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="dashboard-section">
                        <div className="section-header">
                            <h2>Sản phẩm bán chạy</h2>
                            <button className="btn-view-all" onClick={() => navigate('/admin/products')}>
                                Xem tất cả →
                            </button>
                        </div>
                        <div className="top-products">
                            {statistics.topProducts.map((product, index) => (
                                <div key={product._id} className="top-product-item">
                                    <div className="product-rank">#{index + 1}</div>
                                    <div className="product-info">
                                        <strong>{product.title}</strong>
                                        <p>Đã bán: {product.totalSold} sản phẩm</p>
                                    </div>
                                    <div className="product-revenue">
                                        {formatPrice(product.revenue)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Monthly Revenue Chart (Simple) */}
                {statistics.revenue.monthly.length > 0 && (
                    <div className="dashboard-section">
                        <h2>Doanh thu 6 tháng gần đây</h2>
                        <div className="revenue-chart">
                            {statistics.revenue.monthly.map((item) => (
                                <div key={`${item._id.year}-${item._id.month}`} className="chart-bar">
                                    <div
                                        className="bar"
                                        style={{
                                            height: `${(item.revenue / Math.max(...statistics.revenue.monthly.map(i => i.revenue))) * 200}px`
                                        }}
                                    >
                                        <span className="bar-value">{formatPrice(item.revenue)}</span>
                                    </div>
                                    <div className="bar-label">
                                        {item._id.month}/{item._id.year}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
