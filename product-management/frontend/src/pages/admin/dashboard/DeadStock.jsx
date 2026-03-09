import { useEffect, useState, useMemo } from 'react';
import { useAdminAnalyticsStore } from '../../../stores/admin/analyticsStore';
import { useAuthStore } from '../../../stores/authStore';
import moment from 'moment';
import '../../../assets/styles/admin-dashboard.css';

const formatFullVND = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const DeadStock = () => {
    const { user } = useAuthStore();
    const {
        deadStock, storePerformance,
        loading, getDeadStock, getStorePerformance
    } = useAdminAnalyticsStore();

    const isSystemAdmin = useMemo(() =>
        user?.roles?.some(r => r.roleName === 'SystemAdmin'), [user]);

    // Filters
    const [filters, setFilters] = useState({
        store_id: '',
        deadStockDays: 30
    });

    // Fetch data on mount and filter change
    useEffect(() => {
        getDeadStock({ store_id: filters.store_id, days: filters.deadStockDays });

        if (isSystemAdmin && !storePerformance) {
            // Fetch store list for filter dropdown
            getStorePerformance({});
        }
    }, [filters.store_id, filters.deadStockDays, isSystemAdmin]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Get stores list from storePerformance for dropdown
    const storeOptions = useMemo(() => {
        if (!storePerformance?.stores) return [];
        return storePerformance.stores.map(s => ({
            id: s.storeId,
            name: `${s.storeCode} - ${s.storeName}`
        }));
    }, [storePerformance]);

    return (
        <div className="admin-page">
            <div className="ap-container">
                <div className="dash-header">
                    <h2> Tồn kho chết</h2>
                    <span className="dash-updated">
                        Cập nhật lần cuối: {moment().format('DD/MM/YYYY HH:mm')}
                    </span>
                </div>

                {/* Filters */}
                <div className="dash-filters">
                    {isSystemAdmin && storeOptions.length > 0 && (
                        <div className="dash-filter-item">
                            <label>Cửa hàng</label>
                            <select
                                value={filters.store_id}
                                onChange={e => handleFilterChange('store_id', e.target.value)}
                            >
                                <option value="">Tất cả cửa hàng</option>
                                {storeOptions.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="dash-filter-item">
                        <label>Không bán trong</label>
                        <select
                            value={filters.deadStockDays}
                            onChange={e => handleFilterChange('deadStockDays', e.target.value)}
                        >
                            <option value={30}>30 ngày</option>
                            <option value={60}>60 ngày</option>
                            <option value={90}>90 ngày</option>
                        </select>
                    </div>
                </div>

                {/* Dead Stock Table */}
                <div className="dash-chart-section">
                    <h3>📋 Danh sách tồn kho chết (không bán trong {filters.deadStockDays} ngày)</h3>
                    <div className="dash-table-container">
                        {loading.deadStock ? (
                            <div className="dash-loading">Đang tải...</div>
                        ) : deadStock?.items?.length > 0 ? (
                            <table className="dash-table">
                                <thead>
                                    <tr>
                                        <th>Sản phẩm</th>
                                        <th>Cửa hàng</th>
                                        <th>Tồn kho</th>
                                        <th>Giá trị đọng</th>
                                        <th>Ngày bán cuối</th>
                                        <th>Số ngày</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deadStock.items.map((item, i) => {
                                        const severity = item.daysSinceLastSold > 60 ? 'critical' :
                                            item.daysSinceLastSold > 30 ? 'warning' : 'normal';
                                        return (
                                            <tr key={i} className={`dead-stock-${severity}`}>
                                                <td>
                                                    <div className="dash-product-cell">
                                                        {item.thumbnail && (
                                                            <img src={item.thumbnail} alt="" className="dash-product-thumb" />
                                                        )}
                                                        <span>{item.title}</span>
                                                    </div>
                                                </td>
                                                <td>{item.storeCode} - {item.storeName}</td>
                                                <td>{item.stock}</td>
                                                <td>{formatFullVND(item.stockValue)}</td>
                                                <td>{item.lastSoldDate ? moment(item.lastSoldDate).format('DD/MM/YYYY') : 'Chưa bán'}</td>
                                                <td>
                                                    <span className={`dash-badge ${severity}`}>
                                                        {item.daysSinceLastSold >= 9999 ? '∞' : `${item.daysSinceLastSold} ngày`}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="dash-empty">Không có sản phẩm tồn kho chết 🎉</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeadStock;
