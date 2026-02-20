import { create } from 'zustand';
import api from '../services/axios';
import { toast } from 'react-toastify';

export const useOrderStore = create((set, get) => ({
    orders: [],
    currentOrder: null,
    pagination: null,
    loading: false,

    // Checkout
    checkout: async (userInfo, paymentMethod = 'COD') => {
        set({ loading: true });
        try {
            const { data } = await api.post('/orders/checkout', {
                userInfo,
                paymentMethod
            });

            // If VNPay, redirect to payment URL
            if (paymentMethod === 'VNPay' && data.data.paymentUrl) {
                window.location.href = data.data.paymentUrl;
                return null; // Don't return order as user will be redirected
            }

            toast.success('Đặt hàng thành công!');
            set({ loading: false });
            return data.data.order;
        } catch (error) {
            set({ loading: false });
            toast.error(error.response?.data?.message || 'Đặt hàng thất bại!');
            throw error;
        }
    },

    // Get orders
    getOrders: async (params = {}) => {
        set({ loading: true });
        try {
            const { data } = await api.get('/orders', { params });
            set({
                orders: data.data || [],
                pagination: data.pagination,
                loading: false
            });
        } catch (error) {
            set({ loading: false });
            toast.error('Lỗi khi tải đơn hàng');
        }
    },


    // Cancel order
    cancelOrder: async (orderId) => {
        try {
            const { data } = await api.patch(`/orders/${orderId}/cancel`);
            toast.success('Đã hủy đơn hàng!');
            await get().getOrders(); // Refresh orders
            return data.data.order;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi hủy đơn hàng');
            throw error;
        }
    },

    // Clear current order
    clearCurrentOrder: () => {
        set({ currentOrder: null });
    }
}));
