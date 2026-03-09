import { useEffect, useState, useMemo } from 'react';
import { useAdminAnalyticsStore } from '../../../stores/admin/analyticsStore';
import { useAuthStore } from '../../../stores/authStore';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import moment from 'moment';
import '../../../assets/styles/admin-dashboard.css';

const COLORS = ['#1DB56C', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const formatVND = (value) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return new Intl.NumberFormat('vi-VN').format(value);
};

const formatFullVND = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const RevenueBestSellers = () => {
    const { user } = useAuthStore();
    const {
        revenue, storePerformance, bestSellers,
        loading, getRevenueOverview, getStorePerformance, getBestSellers
    } = useAdminAnalyticsStore();

    const isSystemAdmin = useMemo(() =>
        user?.roles?.some(r => r.roleName === 'SystemAdmin'), [user]);

    // Filters
    const [filters, setFilters] = useState({
        from: '',
        to: '',
        store_id: ''
    });

    // Best Sellers Sort Criteria
    const [bestSellersSortBy, setBestSellersSortBy] = useState('quantity');
    const [bestSellersTopLimit, setBestSellersTopLimit] = useState(10);

    // Fetch data on mount and filter change
    useEffect(() => {
        if (!filters.from || !filters.to) return;

        const params = { from: filters.from, to: filters.to };
        if (filters.store_id) params.store_id = filters.store_id;

        getRevenueOverview(params);
        getBestSellers({ ...params, sort_by: bestSellersSortBy, limit: bestSellersTopLimit });

        if (isSystemAdmin) {
            getStorePerformance({ from: filters.from, to: filters.to });
        }
    }, [filters.from, filters.to, filters.store_id, bestSellersSortBy, bestSellersTopLimit, isSystemAdmin]);

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

    const summary = revenue?.summary || { totalRevenue: 0, totalOrders: 0, uniqueCustomers: 0, totalItemsSold: 0 };

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="dash-tooltip">
                <p className="dash-tooltip-label">{moment(label).format('DD/MM/YYYY')}</p>
                {payload.map((entry, i) => (
                    <p key={i} style={{ color: entry.color }}>
                        {entry.name === 'revenue' ? 'Doanh thu' : 'Đơn hàng'}: {
                            entry.name === 'revenue' ? formatFullVND(entry.value) : entry.value
                        }
                    </p>
                ))}
            </div>
        );
    };

    return (
        <div className="admin-page">
            <div className="ap-container">
                <div className="dash-header">
                    <h2> Doanh thu - Bán chạy</h2>
                    <span className="dash-updated">
                        Cập nhật lần cuối: {moment().format('DD/MM/YYYY HH:mm')}
                    </span>
                </div>

                {/* Filters */}
                <div className="dash-filters">
                    <div className="dash-filter-item">
                        <label>Từ ngày</label>
                        <input
                            type="date"
                            value={filters.from}
                            onChange={e => handleFilterChange('from', e.target.value)}
                        />
                    </div>
                    <div className="dash-filter-item">
                        <label>Đến ngày</label>
                        <input
                            type="date"
                            value={filters.to}
                            onChange={e => handleFilterChange('to', e.target.value)}
                        />
                    </div>
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
                </div>

                {/* Summary Cards */}
                <div className="dash-summary">
                    <div className="dash-card">
                        <div className="dash-card-icon revenue">
                            <i className="fa-solid fa-coins"></i>
                        </div>
                        <div className="dash-card-info">
                            <span className="dash-card-label">Tổng doanh thu</span>
                            <span className="dash-card-value">{formatFullVND(summary.totalRevenue)}</span>
                        </div>
                    </div>
                    <div className="dash-card">
                        <div className="dash-card-icon orders">
                            <i className="fa-solid fa-bag-shopping"></i>
                        </div>
                        <div className="dash-card-info">
                            <span className="dash-card-label">Tổng đơn hàng</span>
                            <span className="dash-card-value">{summary.totalOrders.toLocaleString('vi-VN')}</span>
                        </div>
                    </div>
                    <div className="dash-card">
                        <div className="dash-card-icon customers">
                            <i className="fa-solid fa-users"></i>
                        </div>
                        <div className="dash-card-info">
                            <span className="dash-card-label">Khách hàng</span>
                            <span className="dash-card-value">{summary.uniqueCustomers.toLocaleString('vi-VN')}</span>
                        </div>
                    </div>
                    <div className="dash-card">
                        <div className="dash-card-icon items">
                            <i className="fa-solid fa-box"></i>
                        </div>
                        <div className="dash-card-info">
                            <span className="dash-card-label">SP đã bán</span>
                            <span className="dash-card-value">{summary.totalItemsSold.toLocaleString('vi-VN')}</span>
                        </div>
                    </div>
                </div>

                {/* Revenue Trend Line Chart */}
                <div className="dash-chart-section">
                    <h3>📈 Xu hướng doanh thu</h3>
                    <div className="dash-chart-container">
                        {loading.revenue ? (
                            <div className="dash-loading">Đang tải...</div>
                        ) : revenue?.daily?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={350}>
                                <LineChart data={revenue.daily}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={v => moment(v).format('DD/MM')}
                                        stroke="#6b7280"
                                        fontSize={12}
                                    />
                                    <YAxis
                                        tickFormatter={formatVND}
                                        stroke="#6b7280"
                                        fontSize={12}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#1DB56C"
                                        strokeWidth={2.5}
                                        dot={{ fill: '#1DB56C', r: 3 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="dash-empty">Không có dữ liệu trong khoảng thời gian này</div>
                        )}
                    </div>
                </div>

                {/* Row: Store Performance + Best Sellers */}
                <div className="dash-charts-row">
                    {/* Store Performance Bar Chart (SystemAdmin only) */}
                    {isSystemAdmin && (
                        <div className="dash-chart-section dash-chart-half">
                            <h3>📊 So sánh doanh thu</h3>
                            <div className="dash-chart-container">
                                {loading.storePerformance ? (
                                    <div className="dash-loading">Đang tải...</div>
                                ) : storePerformance?.stores?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={350}>
                                        <BarChart data={storePerformance.stores}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis
                                                dataKey="storeCode"
                                                stroke="#6b7280"
                                                fontSize={12}
                                            />
                                            <YAxis
                                                tickFormatter={formatVND}
                                                stroke="#6b7280"
                                                fontSize={12}
                                            />
                                            <Tooltip
                                                formatter={(value) => formatFullVND(value)}
                                                labelFormatter={(label) => {
                                                    const store = storePerformance.stores.find(s => s.storeCode === label);
                                                    return store ? store.storeName : label;
                                                }}
                                            />
                                            <Bar dataKey="revenue" name="Doanh thu" radius={[6, 6, 0, 0]}>
                                                {storePerformance.stores.map((_, i) => (
                                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="dash-empty">Không có dữ liệu</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Best Sellers Horizontal Bar Chart */}
                    <div className={`dash-chart-section ${isSystemAdmin ? 'dash-chart-half' : 'dash-chart-full'}`}>
                        <div className="dash-chart-header">
                            <h3>🏆 Top bán chạy</h3>
                            <div className="dash-sort-selector">
                                
                                <select
                                    value={bestSellersTopLimit}
                                    onChange={(e) => setBestSellersTopLimit(parseInt(e.target.value, 10))}
                                    className="dash-sort-select"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                                
                                <select
                                    value={bestSellersSortBy}
                                    onChange={(e) => setBestSellersSortBy(e.target.value)}
                                    className="dash-sort-select"
                                >
                                    <option value="quantity">Số lượng</option>
                                    <option value="revenue">Doanh thu</option>
                                </select>
                            </div>
                        </div>
                        <div className="dash-chart-container">
                            {loading.bestSellers ? (
                                <div className="dash-loading">Đang tải...</div>
                            ) : bestSellers?.products?.length > 0 ? (
                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart data={bestSellers.products} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis
                                            type="number"
                                            stroke="#6b7280"
                                            fontSize={12}
                                            tickFormatter={bestSellersSortBy === 'revenue' ? formatVND : undefined}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="title"
                                            width={150}
                                            stroke="#6b7280"
                                            fontSize={11}
                                            tickFormatter={v => v.length > 20 ? v.slice(0, 20) + '...' : v}
                                        />
                                        <Tooltip
                                            formatter={(value, name) =>
                                                name === 'Số lượng bán' ? `${value} SP` : formatFullVND(value)
                                            }
                                        />
                                        <Bar
                                            dataKey={bestSellersSortBy === 'revenue' ? 'revenue' : 'totalSold'}
                                            name={bestSellersSortBy === 'revenue' ? 'Doanh thu' : 'Số lượng bán'}
                                            fill={bestSellersSortBy === 'revenue' ? '#0ea5e9' : '#1DB56C'}
                                            radius={[0, 6, 6, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="dash-empty">Không có dữ liệu</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RevenueBestSellers;
