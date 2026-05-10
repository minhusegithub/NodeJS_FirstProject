import { useEffect, useState, useMemo } from 'react';
import { useTransferStore } from '../../../stores/admin/transferStore';
import { useAuthStore } from '../../../stores/authStore';
import moment from 'moment';
import '../../../assets/styles/admin-dashboard.css';
import '../../../assets/styles/transfer.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatVND = (value) => {
    const n = Number(value) || 0;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₫`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K ₫`;
    return `${n.toLocaleString('vi-VN')} ₫`;
};

const STATUS_CONFIG = {
    pending: { label: 'Chờ duyệt', cls: 'pending' },
    source_approved: { label: 'Nguồn đã duyệt', cls: 'source-approved' },
    dest_approved: { label: 'Đích đã duyệt', cls: 'dest-approved' },
    approved: { label: 'Đã duyệt', cls: 'approved' },
    rejected: { label: 'Từ chối', cls: 'rejected' },
    expired: { label: 'Hết hạn', cls: 'expired' },
    draft: { label: 'Nháp', cls: 'draft' },
    pending_approval: { label: 'Chờ duyệt', cls: 'pending' },
    in_transit: { label: 'Đang vận chuyển', cls: 'in-transit' },
    received: { label: 'Đã nhận', cls: 'received' },
    completed: { label: 'Hoàn tất', cls: 'completed' },
    cancelled: { label: 'Đã hủy', cls: 'cancelled' },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || { label: status, cls: 'draft' };
    return <span className={`trf-badge trf-badge--${cfg.cls}`}>{cfg.label}</span>;
};

const ScoreBar = ({ score }) => {
    const pct = Math.round((Number(score) || 0) * 100);
    const cls = pct >= 70 ? 'high' : pct >= 40 ? 'mid' : 'low';
    return (
        <div className="trf-score-wrap">
            <div className="trf-score-bar">
                <div className={`trf-score-fill trf-score-fill--${cls}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="trf-score-label">{(Number(score) || 0).toFixed(3)}</span>
        </div>
    );
};

// ─── Tab: Đề xuất ─────────────────────────────────────────────────────────────

// Xác định nhãn nút duyệt dựa trên user đang ở bên nào
const getApproveLabel = (s, userStoreIds) => {
    const isSource = !userStoreIds || userStoreIds.includes(s.source_store_id);
    const isDest = !userStoreIds || userStoreIds.includes(s.dest_store_id);
    if (isSource && !s.source_approved_at) return 'Duyệt (xuất kho)';
    if (isDest && !s.dest_approved_at) return 'Duyệt (nhận kho)';
    return null; // đã duyệt rồi
};

// Approval progress indicator
const ApprovalProgress = ({ s }) => (
    <div className="trf-approval-progress">
        <span className={`trf-approval-dot ${s.source_approved_at ? 'done' : 'wait'}`}
            title={s.source_approved_at ? 'Nguồn đã duyệt' : 'Chờ nguồn'}>
            {s.source_approved_at ? '✓' : '...'} Xuất
        </span>
        <span className={`trf-approval-dot ${s.dest_approved_at ? 'done' : 'wait'}`}
            title={s.dest_approved_at ? 'Đích đã duyệt' : 'Chờ đích'}>
            {s.dest_approved_at ? '✓' : '...'} Nhận
        </span>
    </div>
);

const SuggestionsTab = ({ isManager, userStoreIds }) => {
    const {
        suggestions, suggestionsTotal, suggestionStats, loading,
        getSuggestions, getSuggestionStats, runScan, approveSuggestion, rejectSuggestion,
        suggestionFilters, setSuggestionFilters
    } = useTransferStore();

    const [rejectId, setRejectId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        getSuggestions();
        getSuggestionStats();
    }, [suggestionFilters]);

    const handleReject = async () => {
        if (!rejectId) return;
        await rejectSuggestion(rejectId, rejectReason);
        setRejectId(null);
        setRejectReason('');
    };

    // Tính nhãn nút duyệt cho từng đề xuất
    const canApprove = (s) => getApproveLabel(s, userStoreIds) !== null;

    return (
        <>
            {/* KPI bar */}
            <div className="trf-kpi-row">
                <div className="trf-kpi-card trf-kpi--blue">
                    <i className="fa-solid fa-list-check" />
                    <div>
                        <div className="trf-kpi-value">{suggestionStats.total}</div>
                        <div className="trf-kpi-desc">Tổng đề xuất</div>
                    </div>
                </div>
                <div className="trf-kpi-card trf-kpi--orange">
                    <i className="fa-solid fa-clock" />
                    <div>
                        <div className="trf-kpi-value">{suggestionStats.pending}</div>
                        <div className="trf-kpi-desc">Chờ phê duyệt</div>
                    </div>
                </div>
                <div className="trf-kpi-card trf-kpi--green">
                    <i className="fa-solid fa-circle-check" />
                    <div>
                        <div className="trf-kpi-value">{suggestionStats.approved}</div>
                        <div className="trf-kpi-desc">Đã phê duyệt</div>
                    </div>
                </div>
                {isManager && (
                    <button
                        className="trf-scan-btn"
                        onClick={runScan}
                        disabled={loading.scan}
                    >
                        {loading.scan
                            ? <><i className="fa-solid fa-spinner fa-spin" /> Đang quét...</>
                            : <><i className="fa-solid fa-magnifying-glass-chart" /> Quét đề xuất mới</>
                        }
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="dash-filters">
                <div className="dash-filter-item">
                    <label>Trạng thái</label>
                    <select
                        value={suggestionFilters.status}
                        onChange={e => setSuggestionFilters({ status: e.target.value })}
                    >
                        <option value="">Tất cả</option>
                        <option value="pending">Chờ duyệt</option>
                        <option value="approved">Đã duyệt</option>
                        <option value="rejected">Từ chối</option>
                        <option value="expired">Hết hạn</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="dash-chart-section">
                <div className="dash-chart-header">
                    <h3>📋 Danh sách đề xuất chuyển kho</h3>
                    <button className="trf-refresh-btn" onClick={() => getSuggestions()}>
                        <i className="fa-solid fa-rotate-right" /> Làm mới
                    </button>
                </div>

                <div className="dash-table-container">
                    {loading.suggestions ? (
                        <div className="dash-loading">Đang tải...</div>
                    ) : suggestions.length > 0 ? (
                        <table className="dash-table">
                            <thead>
                                <tr>
                                    <th>Sản phẩm</th>
                                    <th>Nguồn → Đích</th>
                                    <th>Số lượng</th>
                                    <th>Điểm MFTS</th>
                                    <th>Khoảng cách</th>
                                    <th>Chi phí ước tính</th>
                                    <th>Hết hạn</th>
                                    <th>Trạng thái</th>
                                    {isManager && <th>Thao tác</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {suggestions.map(s => (
                                    <tr key={s.id}>
                                        <td>
                                            <div className="dash-product-cell">
                                                {s.product?.thumbnail && (
                                                    <img src={s.product.thumbnail} alt="" className="dash-product-thumb" />
                                                )}
                                                <div>
                                                    <div className="trf-product-title">{s.product?.title || `SP #${s.product_id}`}</div>
                                                    <div className="trf-product-sku">{s.product?.sku}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="trf-route">
                                                <span className="trf-store trf-store--source">{s.sourceStore?.code}</span>
                                                <i className="fa-solid fa-arrow-right trf-arrow" />
                                                <span className="trf-store trf-store--dest">{s.destStore?.code}</span>
                                            </div>
                                        </td>
                                        <td><strong>{s.suggested_qty?.toLocaleString('vi-VN')}</strong> SP</td>
                                        <td><ScoreBar score={s.mfts_score} /></td>
                                        <td>{Number(s.distance_km).toFixed(1)} km</td>
                                        <td>{formatVND(s.estimated_cost)}</td>
                                        <td>
                                            <span className={moment(s.expires_at).isBefore(moment()) ? 'trf-expired-text' : ''}>
                                                {moment(s.expires_at).format('DD/MM HH:mm')}
                                            </span>
                                        </td>
                                        <td><StatusBadge status={s.status} /></td>
                                        {isManager && (
                                            <td>
                                                {/* Hiện progress bar khi đang chờ 1 bên */}
                                                {['pending', 'source_approved', 'dest_approved'].includes(s.status) && (
                                                    <ApprovalProgress s={s} />
                                                )}
                                                {['pending', 'source_approved', 'dest_approved'].includes(s.status) && (
                                                    <div className="trf-action-row">
                                                        {/* Nút duyệt — chỉ hiện nếu user chưa duyệt phía mình */}
                                                        {canApprove(s) && (
                                                            <button
                                                                className="trf-btn trf-btn--approve"
                                                                onClick={() => approveSuggestion(s.id)}
                                                                disabled={loading.action}
                                                            >
                                                                <i className="fa-solid fa-check" /> {getApproveLabel(s, userStoreIds)}
                                                            </button>
                                                        )}
                                                        {/* Nút từ chối — luôn hiện khi còn trạng thái trung gian */}
                                                        <button
                                                            className="trf-btn trf-btn--reject"
                                                            onClick={() => { setRejectId(s.id); setRejectReason(''); }}
                                                            disabled={loading.action}
                                                        >
                                                            <i className="fa-solid fa-xmark" /> Từ chối
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="dash-empty">
                            Không có đề xuất nào. Bấm <strong>Quét đề xuất mới</strong> để bắt đầu 🚀
                        </div>
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            {rejectId && (
                <div className="trf-modal-overlay" onClick={() => setRejectId(null)}>
                    <div className="trf-modal" onClick={e => e.stopPropagation()}>
                        <h3>Từ chối đề xuất #{rejectId}</h3>
                        <label>Lý do (tuỳ chọn)</label>
                        <textarea
                            className="trf-textarea"
                            rows={3}
                            placeholder="Nhập lý do từ chối..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                        />
                        <div className="trf-modal-actions">
                            <button className="trf-btn trf-btn--secondary" onClick={() => setRejectId(null)}>Hủy</button>
                            <button className="trf-btn trf-btn--reject" onClick={handleReject} disabled={loading.action}>
                                Xác nhận từ chối
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ─── Tab: Phiếu chuyển kho ────────────────────────────────────────────────────

const NEXT_STATUS = {
    draft: 'pending_approval',
    pending_approval: 'approved',
    approved: 'in_transit',
    in_transit: 'received',
    received: 'completed',
};

const NEXT_LABEL = {
    draft: 'Gửi phê duyệt',
    pending_approval: 'Phê duyệt',
    approved: 'Xác nhận xuất kho',
    in_transit: 'Xác nhận nhận hàng',
    received: 'Hoàn tất',
};

const RequestsTab = ({ isManager }) => {
    const {
        requests, requestsTotal, requestDetail, loading,
        getRequests, getRequestDetail, updateRequestStatus,
        requestFilters, setRequestFilters
    } = useTransferStore();

    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => { getRequests(); }, [requestFilters]);

    const handleSelectRow = (id) => {
        setSelectedId(id === selectedId ? null : id);
        if (id !== selectedId) getRequestDetail(id);
    };

    const handleStatusUpdate = async (id, status) => {
        await updateRequestStatus(id, status);
    };

    return (
        <>
            {/* KPI row */}
            <div className="trf-kpi-row">
                <div className="trf-kpi-card trf-kpi--blue">
                    <i className="fa-solid fa-file-invoice" />
                    <div>
                        <div className="trf-kpi-value">{requestsTotal}</div>
                        <div className="trf-kpi-desc">Tổng phiếu</div>
                    </div>
                </div>
                <div className="trf-kpi-card trf-kpi--orange">
                    <i className="fa-solid fa-truck-fast" />
                    <div>
                        <div className="trf-kpi-value">
                            {requests.filter(r => r.status === 'in_transit').length}
                        </div>
                        <div className="trf-kpi-desc">Đang vận chuyển</div>
                    </div>
                </div>
                <div className="trf-kpi-card trf-kpi--green">
                    <i className="fa-solid fa-circle-check" />
                    <div>
                        <div className="trf-kpi-value">
                            {requests.filter(r => r.status === 'completed').length}
                        </div>
                        <div className="trf-kpi-desc">Hoàn tất</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="dash-filters">
                <div className="dash-filter-item">
                    <label>Trạng thái</label>
                    <select
                        value={requestFilters.status}
                        onChange={e => setRequestFilters({ status: e.target.value })}
                    >
                        <option value="">Tất cả</option>
                        <option value="pending_approval">Chờ duyệt</option>
                        <option value="approved">Đã duyệt</option>
                        <option value="in_transit">Đang vận chuyển</option>
                        <option value="received">Đã nhận</option>
                        <option value="completed">Hoàn tất</option>
                        <option value="cancelled">Đã hủy</option>
                    </select>
                </div>
            </div>

            <div className="trf-split-layout">
                {/* Left: list */}
                <div className="dash-chart-section trf-list-panel">
                    <div className="dash-chart-header">
                        <h3>📦 Danh sách phiếu chuyển kho</h3>
                        <button className="trf-refresh-btn" onClick={() => getRequests()}>
                            <i className="fa-solid fa-rotate-right" /> Làm mới
                        </button>
                    </div>
                    <div className="dash-table-container">
                        {loading.requests ? (
                            <div className="dash-loading">Đang tải...</div>
                        ) : requests.length > 0 ? (
                            <table className="dash-table">
                                <thead>
                                    <tr>
                                        <th>Mã phiếu</th>
                                        <th>Nguồn → Đích</th>
                                        <th>SL</th>
                                        <th>Trạng thái</th>
                                        <th>Ngày tạo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map(r => (
                                        <tr
                                            key={r.id}
                                            className={selectedId === r.id ? 'trf-row--selected' : ''}
                                            onClick={() => handleSelectRow(r.id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td><code className="trf-code">{r.transfer_code}</code></td>
                                            <td>
                                                <div className="trf-route">
                                                    <span className="trf-store trf-store--source">{r.sourceStore?.code}</span>
                                                    <i className="fa-solid fa-arrow-right trf-arrow" />
                                                    <span className="trf-store trf-store--dest">{r.destStore?.code}</span>
                                                </div>
                                            </td>
                                            <td>{r.total_quantity?.toLocaleString('vi-VN')} SP</td>
                                            <td><StatusBadge status={r.status} /></td>
                                            <td>{moment(r.created_at).format('DD/MM/YY')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="dash-empty">Chưa có phiếu chuyển kho nào</div>
                        )}
                    </div>
                </div>

                {/* Right: detail panel */}
                {selectedId && (
                    <div className="dash-chart-section trf-detail-panel">
                        {loading.requestDetail ? (
                            <div className="dash-loading">Đang tải chi tiết...</div>
                        ) : requestDetail ? (
                            <>
                                <div className="trf-detail-header">
                                    <div>
                                        <h3>Chi tiết phiếu</h3>
                                        <code className="trf-code trf-code--lg">{requestDetail.transfer_code}</code>
                                    </div>
                                    <StatusBadge status={requestDetail.status} />
                                </div>

                                <div className="trf-detail-meta">
                                    <div className="trf-meta-row">
                                        <span className="trf-meta-label">Nguồn</span>
                                        <span>{requestDetail.sourceStore?.name}</span>
                                    </div>
                                    <div className="trf-meta-row">
                                        <span className="trf-meta-label">Đích</span>
                                        <span>{requestDetail.destStore?.name}</span>
                                    </div>
                                    <div className="trf-meta-row">
                                        <span className="trf-meta-label">Khoảng cách</span>
                                        <span>{Number(requestDetail.distance_km || 0).toFixed(1)} km</span>
                                    </div>
                                    <div className="trf-meta-row">
                                        <span className="trf-meta-label">Chi phí ước tính</span>
                                        <span>{formatVND(requestDetail.estimated_cost)}</span>
                                    </div>
                                    <div className="trf-meta-row">
                                        <span className="trf-meta-label">Người tạo</span>
                                        <span>{requestDetail.creator?.full_name || '—'}</span>
                                    </div>
                                    {requestDetail.note && (
                                        <div className="trf-meta-row">
                                            <span className="trf-meta-label">Ghi chú</span>
                                            <span className="trf-note">{requestDetail.note}</span>
                                        </div>
                                    )}
                                    {requestDetail.suggestion && (
                                        <div className="trf-meta-row">
                                            <span className="trf-meta-label">Điểm MFTS</span>
                                            <ScoreBar score={requestDetail.suggestion?.mfts_score} />
                                        </div>
                                    )}
                                </div>

                                {/* Items */}
                                <h4 className="trf-items-title">Sản phẩm trong phiếu</h4>
                                <table className="dash-table trf-items-table">
                                    <thead>
                                        <tr>
                                            <th>Sản phẩm</th>
                                            <th>Số lượng chuyển</th>

                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requestDetail.items?.map(item => (
                                            <tr key={item.id}>
                                                <td>
                                                    <div className="dash-product-cell">
                                                        {item.product?.thumbnail && (
                                                            <img src={item.product.thumbnail} alt="" className="dash-product-thumb" />
                                                        )}
                                                        <div>
                                                            <div className="trf-product-title">{item.product?.title}</div>
                                                            <div className="trf-product-sku">{item.product?.sku}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><strong>{item.quantity}</strong> SP</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Action buttons */}
                                {isManager && NEXT_STATUS[requestDetail.status] && (
                                    <div className="trf-detail-actions">
                                        <button
                                            className="trf-btn trf-btn--primary"
                                            onClick={() => handleStatusUpdate(requestDetail.id, NEXT_STATUS[requestDetail.status])}
                                            disabled={loading.action}
                                        >
                                            <i className="fa-solid fa-circle-right" />
                                            {NEXT_LABEL[requestDetail.status]}
                                        </button>
                                        {['pending_approval', 'approved'].includes(requestDetail.status) && (
                                            <button
                                                className="trf-btn trf-btn--reject"
                                                onClick={() => handleStatusUpdate(requestDetail.id, 'cancelled')}
                                                disabled={loading.action}
                                            >
                                                <i className="fa-solid fa-ban" /> Hủy phiếu
                                            </button>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : null}
                    </div>
                )}
            </div>
        </>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SmartTransfer = () => {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState('suggestions');

    const isManager = useMemo(() =>
        user?.roles?.some(r => ['storeManager', 'SystemAdmin'].includes(r.roleName)),
        [user]
    );

    // Danh sách store_id mà user này quản lý (null = SystemAdmin → quản lý tất cả)
    const userStoreIds = useMemo(() => {
        const roles = user?.roles || [];
        const isSystemWide = roles.some(r => r.storeId === null || r.roleName === 'SystemAdmin');
        if (isSystemWide) return null;
        return [...new Set(roles.map(r => r.storeId).filter(Boolean))];
    }, [user]);

    return (
        <div className="admin-page">
            <div className="ap-container">
                <div className="dash-header">
                    <h2>Luân chuyển tồn kho thông minh</h2>
                    <span className="dash-updated">
                        Cập nhật: {moment().format('DD/MM/YYYY HH:mm')}
                    </span>
                </div>

                {/* Tabs */}
                <div className="trf-tabs">
                    <button
                        className={`trf-tab ${activeTab === 'suggestions' ? 'trf-tab--active' : ''}`}
                        onClick={() => setActiveTab('suggestions')}
                    >
                        <i className="fa-solid fa-lightbulb" /> Đề xuất MFTS
                    </button>
                    <button
                        className={`trf-tab ${activeTab === 'requests' ? 'trf-tab--active' : ''}`}
                        onClick={() => setActiveTab('requests')}
                    >
                        <i className="fa-solid fa-file-invoice" /> Phiếu chuyển kho
                    </button>
                </div>

                {activeTab === 'suggestions'
                    ? <SuggestionsTab isManager={isManager} userStoreIds={userStoreIds} />
                    : <RequestsTab isManager={isManager} />
                }
            </div>
        </div>
    );
};

export default SmartTransfer;
