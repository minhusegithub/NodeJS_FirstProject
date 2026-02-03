import { create } from 'zustand';
import api from '../../services/axios';
import { toast } from 'react-toastify';

export const useAdminOrderStore = create((set, get) => ({
    orders: [],
    currentOrder: null,
    statistics: null,
    pagination: null,
    loading: false,

    getOrders: async (params = {}) => {
        set({ loading: true });
        try {
            const { data } = await api.get('/admin/orders', { params });
            set({
                orders: data.data.orders,
                pagination: data.data.pagination,
                loading: false
            });
        } catch (error) {
            set({ loading: false });
            toast.error('Lỗi khi tải đơn hàng');
        }
    },

    getOrder: async (id) => {
        set({ loading: true });
        try {
            const { data } = await api.get(`/admin/orders/${id}`);
            set({
                currentOrder: data.data.order,
                loading: false
            });
        } catch (error) {
            set({ loading: false });
            toast.error('Không tìm thấy đơn hàng');
        }
    },

    updateStatus: async (id, status) => {
        try {
            const { data } = await api.patch(`/admin/orders/${id}/status`, { status });
            toast.success('Cập nhật trạng thái thành công!');
            await get().getOrders();
            return data.data.order;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
            throw error;
        }
    },

    deleteOrder: async (id) => {
        try {
            await api.delete(`/admin/orders/${id}`);
            toast.success('Xóa đơn hàng thành công!');
            await get().getOrders();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi xóa đơn hàng');
            throw error;
        }
    },

    getStatistics: async () => {
        try {
            const { data } = await api.get('/admin/orders/statistics');
            set({ statistics: data.data });
        } catch (error) {
            toast.error('Lỗi khi tải thống kê');
        }
    },

    clearCurrentOrder: () => {
        set({ currentOrder: null });
    }
}));
