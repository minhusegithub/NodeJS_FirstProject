import { create } from 'zustand';
import api from '../../services/axios';
import { toast } from 'react-toastify';

export const useAdminOrderStore = create((set, get) => ({
    orders: [],
    currentOrder: null,
    pagination: null,
    loading: false,

    getOrders: async (params = {}) => {
        set({ loading: true });
        try {
            console.log('📡 Fetching admin orders with params:', params);
            const { data } = await api.get('/admin/orders', { params });
            console.log('✅ Admin orders response:', data);
            set({
                orders: data.data || [],
                pagination: data.pagination,
                loading: false
            });
        } catch (error) {
            console.error('❌ Admin orders error:', error);
            console.error('❌ Error response:', error.response?.data);
            console.error('❌ Error status:', error.response?.status);
            set({ loading: false });
            toast.error(error.response?.data?.message || 'Lỗi khi tải đơn hàng');
        }
    },

    getOrder: async (id) => {
        set({ loading: true });
        try {
            const { data } = await api.get(`/admin/orders/${id}`);
            set({
                currentOrder: data.data,
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
            return data.data;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
            throw error;
        }
    },

    clearCurrentOrder: () => {
        set({ currentOrder: null });
    }
}));
