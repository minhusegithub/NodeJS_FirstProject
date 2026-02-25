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
            
            const { data } = await api.get('/admin/orders', { params });
            
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
