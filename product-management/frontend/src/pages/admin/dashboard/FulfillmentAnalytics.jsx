import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { useAdminAnalyticsStore } from '../../../stores/admin/analyticsStore';
import { useAuthStore } from '../../../stores/authStore';
import '../../../assets/styles/admin-dashboard.css';

const formatMinutes = (value) => {
    const totalMinutes = Number(value) || 0;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours <= 0) return `${minutes}m`;
    if (minutes <= 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
};

const getSlaTone = (rate) => {
    if (rate >= 90) return 'good';
    if (rate >= 70) return 'warn';
    return 'bad';
};

const BOTTLENECK_LABELS = {
    LEAD_TIME: 'Khâu xác nhận đơn',
    FULFILLMENT: 'Khâu đóng gói',
    DELIVERY: 'Khâu vận chuyển',
    OPTIMAL: 'Hệ thống đang vận hành ổn định'
};

const toDateInputValue = (date) => moment(date).format('YYYY-MM-DD');

const FulfillmentAnalytics = () => {
    const { user } = useAuthStore();
    const {
        fulfillmentReports,
        simulatedFulfillment,
        storePerformance,
        loading,
        getFulfillmentReports,
        simulateFulfillmentSla,
        getStorePerformance
    } = useAdminAnalyticsStore();

    const isSystemAdmin = useMemo(() =>
        user?.roles?.some(r => r.roleName === 'SystemAdmin'), [user]);

    const [filters, setFilters] = useState(() => ({
        store_id: '',
        start_date: '',
        end_date: ''
    }));
    const [simulatedSlaMins, setSimulatedSlaMins] = useState(240);
    const [debouncedSlaMins, setDebouncedSlaMins] = useState(240);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSlaMins(simulatedSlaMins);
        }, 500);

        return () => clearTimeout(timer);
    }, [simulatedSlaMins]);

    useEffect(() => {
        // Chỉ tải dữ liệu khi cả 2 ngày đã được chọn
        if (!filters.start_date || !filters.end_date) {
            if (isSystemAdmin && !storePerformance) {
                getStorePerformance({});
            }
            return;
        }

        const params = {
            start_date: filters.start_date,
            end_date: filters.end_date
        };

        if (filters.store_id) {
            params.store_id = filters.store_id;
        }

        getFulfillmentReports(params);
        if (isSystemAdmin && !storePerformance) {
            getStorePerformance({});
        }
    }, [filters.start_date, filters.end_date, filters.store_id, isSystemAdmin]);

    useEffect(() => {
        // Chỉ mô phỏng khi cả 2 ngày đã được chọn
        if (!filters.start_date || !filters.end_date) return;

        const params = {
            start_date: filters.start_date,
            end_date: filters.end_date,
            simulated_sla_mins: debouncedSlaMins
        };

        if (filters.store_id) {
            params.store_id = filters.store_id;
        }

        simulateFulfillmentSla(params);
    }, [filters.start_date, filters.end_date, filters.store_id, debouncedSlaMins]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const storeOptions = useMemo(() => {
        if (!storePerformance?.stores) return [];
        return storePerformance.stores.map(s => ({
            id: s.storeId,
            name: `${s.storeCode} - ${s.storeName}`
        }));
    }, [storePerformance]);

    const reports = fulfillmentReports?.reports || [];
    const isSingleStoreView = !isSystemAdmin || Boolean(filters.store_id);

    const stackedChartData = useMemo(() => {
        if (isSingleStoreView) {
            return reports.map(item => ({
                key: item.reportDate,
                label: moment(item.reportDate).format('DD/MM'),
                avgLeadTimeMins: item.avgLeadTimeMins,
                avgFulfillmentTimeMins: item.avgFulfillmentTimeMins,
                avgDeliveryTimeMins: item.avgDeliveryTimeMins,
                storeName: item.storeName,
                bottleneckStage: item.bottleneckStage
            }));
        }

        const grouped = reports.reduce((acc, item) => {
            const key = item.storeId;
            if (!acc[key]) {
                acc[key] = {
                    key,
                    label: item.storeCode || item.storeName || `Store ${item.storeId}`,
                    storeName: item.storeName,
                    totalOrders: 0,
                    leadWeighted: 0,
                    fulfillmentWeighted: 0,
                    deliveryWeighted: 0
                };
            }

            acc[key].totalOrders += item.totalOrders;
            acc[key].leadWeighted += item.avgLeadTimeMins * item.totalOrders;
            acc[key].fulfillmentWeighted += item.avgFulfillmentTimeMins * item.totalOrders;
            acc[key].deliveryWeighted += item.avgDeliveryTimeMins * item.totalOrders;
            return acc;
        }, {});

        return Object.values(grouped).map(item => ({
            key: item.key,
            label: item.label,
            storeName: item.storeName,
            avgLeadTimeMins: item.totalOrders > 0 ? Math.round(item.leadWeighted / item.totalOrders) : 0,
            avgFulfillmentTimeMins: item.totalOrders > 0 ? Math.round(item.fulfillmentWeighted / item.totalOrders) : 0,
            avgDeliveryTimeMins: item.totalOrders > 0 ? Math.round(item.deliveryWeighted / item.totalOrders) : 0
        }));
    }, [reports, isSingleStoreView, isSystemAdmin, filters.store_id]);

    const overallStats = useMemo(() => {
        if (reports.length === 0) {
            return {
                totalOrders: 0,
                avgInternalMins: 0,
                slaRate: 0,
                bottleneckStage: 'OPTIMAL'
            };
        }

        const totalOrders = reports.reduce((sum, item) => sum + item.totalOrders, 0);
        const totalCompliant = reports.reduce((sum, item) => sum + item.slaCompliantOrders, 0);
        const leadWeighted = reports.reduce((sum, item) => sum + (item.avgLeadTimeMins * item.totalOrders), 0);
        const fulfillmentWeighted = reports.reduce((sum, item) => sum + (item.avgFulfillmentTimeMins * item.totalOrders), 0);
        const deliveryWeighted = reports.reduce((sum, item) => sum + (item.avgDeliveryTimeMins * item.totalOrders), 0);

        const avgLead = totalOrders > 0 ? leadWeighted / totalOrders : 0;
        const avgFulfillment = totalOrders > 0 ? fulfillmentWeighted / totalOrders : 0;
        const avgDelivery = totalOrders > 0 ? deliveryWeighted / totalOrders : 0;
        const bottleneckStage = (() => {
            const maxTime = Math.max(avgLead, avgFulfillment, avgDelivery);
            if (maxTime <= 60) return 'OPTIMAL';
            if (maxTime === avgLead) return 'LEAD_TIME';
            if (maxTime === avgFulfillment) return 'FULFILLMENT';
            return 'DELIVERY';
        })();

        return {
            totalOrders,
            avgInternalMins: Math.round(avgLead + avgFulfillment),
            slaRate: totalOrders > 0 ? (totalCompliant / totalOrders) * 100 : 0,
            bottleneckStage
        };
    }, [reports]);

    const simulationChartData = useMemo(() => {
        const officialMap = new Map(
            reports.map(item => [item.reportDate, item.slaComplianceRate])
        );

        const labels = new Set(reports.map(item => item.reportDate));
        (simulatedFulfillment?.simulated || []).forEach(item => labels.add(item.reportDate));

        return Array.from(labels)
            .sort((a, b) => new Date(a) - new Date(b))
            .map(date => {
                const simulated = simulatedFulfillment?.simulated?.find(item => item.reportDate === date);
                return {
                    reportDate: date,
                    label: moment(date).format('DD/MM'),
                    actualRate: Number(officialMap.get(date) || 0),
                    simulatedRate: Number(simulated?.simulatedRate || 0)
                };
            });
    }, [reports, simulatedFulfillment]);

    const bottleneckText = overallStats.bottleneckStage === 'OPTIMAL'
        ? 'Không có khâu nào vượt ngưỡng cảnh báo trong giai đoạn đã chọn.'
        : `${BOTTLENECK_LABELS[overallStats.bottleneckStage]} đang làm chậm hệ thống nhất.`;

    return (
        <div className="admin-page">
            <div className="ap-container">
                <div className="dash-header">
                    <h2> Phân tích vận hành đơn hàng</h2>
                    <span className="dash-updated">
                        Cập nhật lần cuối: {moment().format('DD/MM/YYYY HH:mm')}
                    </span>
                </div>

                <div className="dash-filters">
                    <div className="dash-filter-item">
                        <label>Từ ngày</label>
                        <input
                            type="date"
                            value={filters.start_date}
                            onChange={(e) => handleFilterChange('start_date', e.target.value)}
                        />
                    </div>
                    <div className="dash-filter-item">
                        <label>Đến ngày</label>
                        <input
                            type="date"
                            value={filters.end_date}
                            onChange={(e) => handleFilterChange('end_date', e.target.value)}
                        />
                    </div>
                    {isSystemAdmin && storeOptions.length > 0 && (
                        <div className="dash-filter-item">
                            <label>Cửa hàng</label>
                            <select
                                value={filters.store_id}
                                onChange={(e) => handleFilterChange('store_id', e.target.value)}
                            >
                                <option value="">Tất cả cửa hàng</option>
                                {storeOptions.map(store => (
                                    <option key={store.id} value={store.id}>{store.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Thông báo khi chưa chọn ngày */}
                {(!filters.start_date || !filters.end_date) && (
                    <div className="dash-empty" style={{ margin: '2rem 0', fontSize: '1rem' }}>
                        📅 Vui lòng chọn <strong>Từ ngày</strong> và <strong>Đến ngày</strong> để xem dữ liệu phân tích.
                    </div>
                )}

                <div className="ops-kpi-grid">
                    <div className={`ops-kpi-card ${getSlaTone(overallStats.slaRate)}`}>
                        <span className="ops-kpi-eyebrow">Tỷ lệ SLA toàn hệ thống</span>
                        <div className="ops-kpi-value">{Math.round(overallStats.slaRate)}%</div>
                        <p>{overallStats.totalOrders.toLocaleString('vi-VN')} đơn đã được phân tích trong kỳ.</p>
                    </div>
                    <div className="ops-kpi-card alert">
                        <span className="ops-kpi-eyebrow">Điểm nghẽn hiện tại</span>
                        <div className="ops-kpi-alert">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            <strong>{BOTTLENECK_LABELS[overallStats.bottleneckStage]}</strong>
                        </div>
                        <p>{bottleneckText}</p>
                    </div>
                    <div className="ops-kpi-card neutral">
                        <span className="ops-kpi-eyebrow">Thời gian xử lý trung bình</span>
                        <div className="ops-kpi-value small">{formatMinutes(overallStats.avgInternalMins)} / đơn</div>
                        <p>Đang tính theo T1 + T2 để phản ánh nội lực vận hành.</p>
                    </div>
                </div>

                <div className="dash-chart-section">
                    <div className="dash-chart-header">
                        <h3>⛓️ Thời gian vận hành</h3>
                        <span className="ops-chart-caption">
                            {isSingleStoreView ? 'Trục X theo ngày' : 'Trục X theo cửa hàng'}
                        </span>
                    </div>
                    <div className="dash-chart-container">
                        {loading.fulfillment ? (
                            <div className="dash-loading">Đang tải...</div>
                        ) : stackedChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={380}>
                                <BarChart data={stackedChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
                                    <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatMinutes} />
                                    <Tooltip
                                        formatter={(value, name, item) => {
                                            const label = name === 'avgLeadTimeMins'
                                                ? 'Khâu xác nhận'
                                                : name === 'avgFulfillmentTimeMins'
                                                    ? 'Khâu đóng gói'
                                                    : 'Khâu vận chuyển';
                                            return [`${formatMinutes(value)}`, label];
                                        }}
                                        labelFormatter={(label, payload) => {
                                            const row = payload?.[0]?.payload;
                                            const target = row?.storeName ? `${row.storeName}` : label;
                                            return `${target}`;
                                        }}
                                    />
                                    <Legend
                                        formatter={(value) => {
                                            if (value === 'avgLeadTimeMins') return 'T1 - Chờ xác nhận';
                                            if (value === 'avgFulfillmentTimeMins') return 'T2 - Đóng gói';
                                            return 'T3 - Vận chuyển';
                                        }}
                                    />
                                    <Bar stackId="time" dataKey="avgLeadTimeMins" fill="#7dd3fc" radius={[0, 0, 0, 0]} />
                                    <Bar stackId="time" dataKey="avgFulfillmentTimeMins" fill="#fb923c" radius={[0, 0, 0, 0]} />
                                    <Bar stackId="time" dataKey="avgDeliveryTimeMins" fill="#a78bfa" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="dash-empty">Không có dữ liệu vận hành trong khoảng thời gian này</div>
                        )}
                    </div>
                </div>

                <div className="dash-chart-section ops-simulation-section">
                    <div className="ops-simulation-header">
                        <div>
                            <h3>🧪 Chế độ Giả định SLA</h3>
                            <p className="ops-simulation-caption">Kéo thanh trượt để xem hệ thống sẽ phản ứng thế nào nếu thay đổi SLA nội bộ.</p>
                        </div>
                        <div className="ops-slider-panel">
                            <label htmlFor="sla-slider">Giả lập Chỉ tiêu SLA: {formatMinutes(simulatedSlaMins)}</label>
                            <input
                                id="sla-slider"
                                className="ops-slider"
                                type="range"
                                min="60"
                                max="720"
                                step="30"
                                value={simulatedSlaMins}
                                onChange={(e) => setSimulatedSlaMins(parseInt(e.target.value, 10))}
                            />
                        </div>
                    </div>
                    <div className={`ops-simulation-chart ${loading.fulfillmentSimulation ? 'is-loading' : ''}`}>
                        {loading.fulfillmentSimulation && (
                            <div className="ops-simulation-overlay">
                                <div className="dash-loading">Đang mô phỏng...</div>
                            </div>
                        )}
                        {simulationChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={360}>
                                <LineChart data={simulationChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
                                    <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `${value}%`} />
                                    <Tooltip
                                        formatter={(value, name) => [
                                            `${Number(value).toFixed(2)}%`,
                                            name === 'actualRate' ? 'SLA thực tế' : 'SLA giả định'
                                        ]}
                                        labelFormatter={(label) => `Ngày ${label}`}
                                    />
                                    <Legend
                                        formatter={(value) => value === 'actualRate' ? 'Tỷ lệ SLA thực tế' : 'Tỷ lệ SLA giả định'}
                                    />
                                    <Line type="monotone" dataKey="actualRate" stroke="#16a34a" strokeWidth={3} dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey="simulatedRate" stroke="#6b7280" strokeWidth={2.5} strokeDasharray="6 6" dot={{ r: 2 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="dash-empty">Không có dữ liệu để mô phỏng SLA trong khoảng thời gian đã chọn</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FulfillmentAnalytics;
