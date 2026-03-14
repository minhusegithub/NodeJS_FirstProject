import { create } from 'zustand';
import api from '../../services/axios';
import { toast } from 'react-toastify';

export const useAdminAnalyticsStore = create((set) => ({
    revenue: null,
    storePerformance: null,
    bestSellers: null,
    deadStock: null,
    fulfillmentReports: null,
    simulatedFulfillment: null,
    loading: {
        revenue: false,
        storePerformance: false,
        bestSellers: false,
        deadStock: false,
        fulfillment: false,
        fulfillmentSimulation: false
    },

    getRevenueOverview: async (params = {}) => {
        set(s => ({ loading: { ...s.loading, revenue: true } }));
        try {
            const { data } = await api.get('/admin/analytics', { params });
            set(s => ({ revenue: data.data, loading: { ...s.loading, revenue: false } }));
        } catch (error) {
            set(s => ({ loading: { ...s.loading, revenue: false } }));
            toast.error(error.response?.data?.message || 'Lỗi khi tải dữ liệu doanh thu');
        }
    },

    getStorePerformance: async (params = {}) => {
        set(s => ({ loading: { ...s.loading, storePerformance: true } }));
        try {
            const { data } = await api.get('/admin/analytics/store-performance', { params });
            set(s => ({ storePerformance: data.data, loading: { ...s.loading, storePerformance: false } }));
        } catch (error) {
            set(s => ({ loading: { ...s.loading, storePerformance: false } }));
            // Silently fail for non-SystemAdmin (403)
            if (error.response?.status !== 403) {
                toast.error(error.response?.data?.message || 'Lỗi khi tải hiệu suất cửa hàng');
            }
        }
    },

    getBestSellers: async (params = {}) => {
        set(s => ({ loading: { ...s.loading, bestSellers: true } }));
        try {
            const { data } = await api.get('/admin/analytics/best-sellers', { params });
            set(s => ({ bestSellers: data.data, loading: { ...s.loading, bestSellers: false } }));
        } catch (error) {
            set(s => ({ loading: { ...s.loading, bestSellers: false } }));
            toast.error(error.response?.data?.message || 'Lỗi khi tải sản phẩm bán chạy');
        }
    },

    getDeadStock: async (params = {}) => {
        set(s => ({ loading: { ...s.loading, deadStock: true } }));
        try {
            const { data } = await api.get('/admin/analytics/dead-stock', { params });
            set(s => ({ deadStock: data.data, loading: { ...s.loading, deadStock: false } }));
        } catch (error) {
            set(s => ({ loading: { ...s.loading, deadStock: false } }));
            toast.error(error.response?.data?.message || 'Lỗi khi tải dữ liệu tồn kho');
        }
    },

    getFulfillmentReports: async (params = {}) => {
        set(s => ({ loading: { ...s.loading, fulfillment: true } }));
        try {
            const { data } = await api.get('/admin/analytics/fulfillment', { params });
            set(s => ({ fulfillmentReports: data.data, loading: { ...s.loading, fulfillment: false } }));
        } catch (error) {
            set(s => ({ loading: { ...s.loading, fulfillment: false } }));
            toast.error(error.response?.data?.message || 'Lỗi khi tải báo cáo vận hành');
        }
    },

    simulateFulfillmentSla: async (params = {}) => {
        set(s => ({ loading: { ...s.loading, fulfillmentSimulation: true } }));
        try {
            const { data } = await api.get('/admin/analytics/fulfillment/simulate', { params });
            set(s => ({ simulatedFulfillment: data.data, loading: { ...s.loading, fulfillmentSimulation: false } }));
        } catch (error) {
            set(s => ({ loading: { ...s.loading, fulfillmentSimulation: false } }));
            toast.error(error.response?.data?.message || 'Lỗi khi mô phỏng SLA');
        }
    }
}));
