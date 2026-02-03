import { create } from 'zustand';
import api from '../../services/axios';
import { toast } from 'react-toastify';

export const useAdminDashboardStore = create((set) => ({
    statistics: null,
    loading: false,

    getStatistics: async () => {
        set({ loading: true });
        try {
            const { data } = await api.get('/admin/dashboard');
            set({
                statistics: data.data,
                loading: false
            });
        } catch (error) {
            set({ loading: false });
            toast.error('Lỗi khi tải thống kê');
        }
    }
}));
