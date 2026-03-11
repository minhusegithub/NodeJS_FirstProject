import { useEffect, useState, useMemo } from 'react';
import { useAdminAnalyticsStore } from '../../../stores/admin/analyticsStore';
import { useAuthStore } from '../../../stores/authStore';
import moment from 'moment';
import '../../../assets/styles/admin-dashboard.css';

const formatFullVND = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const formatDsiScore = (score) => {
    const n = Number(score) || 0;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toFixed(0);
};

const RISK_MAP = {
    CRITICAL: { label: 'Nguy hiểm', cls: 'critical' },
    WARNING:  { label: 'Cảnh báo',  cls: 'warning'  },
    SAFE:     { label: 'An toàn',   cls: 'normal'   }
};

const getRiskKey = (item) => {
    if (item?.riskLevel && RISK_MAP[item.riskLevel]) {
        return item.riskLevel;
    }

    if (item?.daysSinceLastSold > 60) return 'CRITICAL';
    if (item?.daysSinceLastSold > 30) return 'WARNING';
    return 'SAFE';
};

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

    const dsiSummary = useMemo(() => {
        const items = deadStock?.items || [];

        const totalCapitalTiedUp = items.reduce((sum, item) => sum + (Number(item.stockValue) || 0), 0);
        const criticalCount = items.filter(item => getRiskKey(item) === 'CRITICAL').length;
        const liberatedCapital = Number(deadStock?.summary?.liberatedCapital) || 0;

        return {
            totalCapitalTiedUp,
            criticalCount,
            liberatedCapital,
            totalItems: items.length
        };
    }, [deadStock]);

    return (
        <div className="admin-page">
            <div className="ap-container">
                <div className="dash-header">
                    <h2> Tồn kho chết</h2>
                    <span className="dash-updated">
                        Cập nhật lần cuối: {moment().format('DD/MM/YYYY HH:mm')}
                    </span>
                </div>

                <div className="dsi-kpi-grid">
                    <div className="dsi-kpi-card dsi-kpi-tied-up">
                        
                        <h3>Tổng Vốn Đọng</h3>
                        <div className="dsi-kpi-figure">{formatFullVND(dsiSummary.totalCapitalTiedUp)}</div>
                        <p>{dsiSummary.totalItems} mã hàng đang bị chôn vốn</p>
                    </div>

                    <div className="dsi-kpi-card dsi-kpi-critical">
                        
                    <h3>Mã hàng thuộc nhóm <b>CRITICAL</b></h3>
                        <div className="dsi-kpi-figure">{dsiSummary.criticalCount}</div>
                        <p>Cần ưu tiên chuyển kho, xả hàng hoặc xử lý ngay</p>
                    </div>

                    <div className="dsi-kpi-card dsi-kpi-liberated">
                           
                            <h3>Vốn Đã Giải Phóng</h3>
                        <div className="dsi-kpi-figure">{formatFullVND(dsiSummary.liberatedCapital)}</div>
                        <p>
                            {dsiSummary.liberatedCapital > 0
                                ? 'Số tiền đã thu hồi từ các quyết định xử lý tồn kho'
                                : 'KPI này đang chờ dữ liệu xử lý tồn kho từ hệ thống'}
                        </p>
                    </div>
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
                    <h3>📋 Danh sách chôn vốn (không bán trong {filters.deadStockDays} ngày)</h3>
                    {deadStock?.items?.[0]?.calculatedAt && (
                        <p className="dash-dsi-note">
                            Dữ liệu DSI tính lúc: {moment(deadStock.items[0].calculatedAt).format('DD/MM/YYYY HH:mm')}
                        </p>
                    )}
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
                                        <th>Vốn đọng (V)</th>
                                        <th>Tốc độ bán (R)</th>
                                        <th>Ngày ế (D)</th>
                                        <th>Điểm DSI</th>
                                        <th>Ngày bán cuối</th>
                                        <th>Mức rủi ro</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deadStock.items.map((item, i) => {
                                        const risk = RISK_MAP[getRiskKey(item)] ?? RISK_MAP.SAFE;
                                        return (
                                            <tr key={i} className={`dead-stock-${risk.cls}`}>
                                                <td>
                                                    <div className="dash-product-cell">
                                                        {item.thumbnail && (
                                                            <img src={item.thumbnail} alt="" className="dash-product-thumb" />
                                                        )}
                                                        <span>{item.title}</span>
                                                    </div>
                                                </td>
                                                <td>{item.storeCode} - {item.storeName}</td>
                                                <td>{item.stock.toLocaleString('vi-VN')}</td>
                                                <td>{formatFullVND(item.stockValue)}</td>
                                                <td>
                                                    <span className="dash-velocity">
                                                        {item.velocity} sp/30d
                                                    </span>
                                                </td>
                                                <td>{item.daysSinceLastSold} ngày</td>
                                                <td>
                                                    <span className={`dash-badge ${risk.cls}`}>
                                                        {formatDsiScore(item.dsiScore)}
                                                    </span>
                                                </td>
                                                <td>{item.lastSoldDate ? moment(item.lastSoldDate).format('DD/MM/YYYY') : 'Chưa bán'}</td>
                                                <td>
                                                    <span className={`dash-badge ${risk.cls}`}>
                                                        {risk.label}
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
