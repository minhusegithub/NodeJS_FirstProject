import { create } from 'zustand';
import api from '../../services/axios';
import { toast } from 'react-toastify';

export const useTransferStore = create((set, get) => ({
    // ── State ────────────────────────────────────────────────────────────
    suggestions: [],
    suggestionsTotal: 0,
    suggestionsPagination: { page: 1, limit: 20, totalPages: 1 },

    // Thống kê aggregate (dùng cho KPI cards — độc lập với filter/pagination)
    suggestionStats: { total: 0, pending: 0, approved: 0 },

    requests: [],
    requestsTotal: 0,
    requestsPagination: { page: 1, limit: 20, totalPages: 1 },

    requestDetail: null,

    loading: {
        scan: false,
        suggestions: false,
        requests: false,
        requestDetail: false,
        action: false,  // approve / reject / status update
    },

    // Filters
    suggestionFilters: { status: '', store_id: '' },
    requestFilters:    { status: '', store_id: '' },

    setSuggestionFilters: (updates) =>
        set(s => ({ suggestionFilters: { ...s.suggestionFilters, ...updates } })),

    setRequestFilters: (updates) =>
        set(s => ({ requestFilters: { ...s.requestFilters, ...updates } })),

    // ── Suggestions ──────────────────────────────────────────────────────

    // POST /admin/transfer/suggestions/scan
    runScan: async () => {
        set(s => ({ loading: { ...s.loading, scan: true } }));
        try {
            const { data } = await api.post('/admin/transfer/suggestions/scan');
            toast.success(`Quét hoàn tất! Tìm thấy ${data.data?.suggestions ?? 0} đề xuất mới.`);
            await get().getSuggestions();
            await get().getSuggestionStats();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi quét đề xuất');
        } finally {
            set(s => ({ loading: { ...s.loading, scan: false } }));
        }
    },

    // GET /admin/transfer/suggestions (paginated + filtered)
    getSuggestions: async (params = {}) => {
        set(s => ({ loading: { ...s.loading, suggestions: true } }));
        try {
            const filters = get().suggestionFilters;
            const { data } = await api.get('/admin/transfer/suggestions', {
                params: { ...filters, ...params }
            });
            set(s => ({
                suggestions: data.data || [],
                suggestionsTotal: data.pagination?.total || 0,
                suggestionsPagination: data.pagination || s.suggestionsPagination,
                loading: { ...s.loading, suggestions: false }
            }));
        } catch (error) {
            set(s => ({ loading: { ...s.loading, suggestions: false } }));
            toast.error(error.response?.data?.message || 'Lỗi khi tải danh sách đề xuất');
        }
    },

    // GET aggregate stats cho KPI cards (không bị ảnh hưởng bởi filter/pagination)
    getSuggestionStats: async () => {
        try {
            const { data } = await api.get('/admin/transfer/suggestions', {
                params: { limit: 9999, status: '' }
            });
            const all = data.data || [];
            set({
                suggestionStats: {
                    total:    data.pagination?.total || all.length,
                    pending:  all.filter(s => s.status === 'pending').length,
                    approved: all.filter(s => s.status === 'approved').length
                }
            });
        } catch { /* silently fail — KPI không critical */ }
    },

    // PATCH /admin/transfer/suggestions/:id/approve
    approveSuggestion: async (id) => {
        set(s => ({ loading: { ...s.loading, action: true } }));
        try {
            const { data } = await api.patch(`/admin/transfer/suggestions/${id}/approve`);
            toast.success(`Đã phê duyệt! Phiếu chuyển kho ${data.data?.transfer_code} đã được tạo.`);
            await get().getSuggestions();
            await get().getSuggestionStats();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi phê duyệt đề xuất');
        } finally {
            set(s => ({ loading: { ...s.loading, action: false } }));
        }
    },

    // PATCH /admin/transfer/suggestions/:id/reject
    rejectSuggestion: async (id, reason = '') => {
        set(s => ({ loading: { ...s.loading, action: true } }));
        try {
            await api.patch(`/admin/transfer/suggestions/${id}/reject`, { reason });
            toast.info('Đã từ chối đề xuất.');
            await get().getSuggestions();
            await get().getSuggestionStats();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi từ chối đề xuất');
        } finally {
            set(s => ({ loading: { ...s.loading, action: false } }));
        }
    },

    // ── Transfer Requests ─────────────────────────────────────────────────

    // GET /admin/transfer/requests
    getRequests: async (params = {}) => {
        set(s => ({ loading: { ...s.loading, requests: true } }));
        try {
            const filters = get().requestFilters;
            const { data } = await api.get('/admin/transfer/requests', {
                params: { ...filters, ...params }
            });
            set(s => ({
                requests: data.data || [],
                requestsTotal: data.pagination?.total || 0,
                requestsPagination: data.pagination || s.requestsPagination,
                loading: { ...s.loading, requests: false }
            }));
        } catch (error) {
            set(s => ({ loading: { ...s.loading, requests: false } }));
            toast.error(error.response?.data?.message || 'Lỗi khi tải danh sách phiếu');
        }
    },

    // GET /admin/transfer/requests/:id
    getRequestDetail: async (id) => {
        set(s => ({ loading: { ...s.loading, requestDetail: true }, requestDetail: null }));
        try {
            const { data } = await api.get(`/admin/transfer/requests/${id}`);
            set(s => ({
                requestDetail: data.data,
                loading: { ...s.loading, requestDetail: false }
            }));
        } catch (error) {
            set(s => ({ loading: { ...s.loading, requestDetail: false } }));
            toast.error(error.response?.data?.message || 'Lỗi khi tải chi tiết phiếu');
        }
    },

    // PATCH /admin/transfer/requests/:id/status
    updateRequestStatus: async (id, status, extra = {}) => {
        set(s => ({ loading: { ...s.loading, action: true } }));
        try {
            await api.patch(`/admin/transfer/requests/${id}/status`, { status, ...extra });

            const STATUS_LABELS = {
                pending_approval: 'Chờ phê duyệt',
                approved:         'Đã duyệt',
                in_transit:       'Đang vận chuyển',
                received:         'Đã nhận hàng',
                completed:        'Hoàn tất',
                cancelled:        'Đã hủy',
            };
            toast.success(`Cập nhật trạng thái: ${STATUS_LABELS[status] || status}`);

            await get().getRequests();
            if (get().requestDetail?.id === id) {
                await get().getRequestDetail(id);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
        } finally {
            set(s => ({ loading: { ...s.loading, action: false } }));
        }
    },
}));
