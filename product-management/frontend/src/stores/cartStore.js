import { create } from 'zustand';
import api from '../services/axios';
import { toast } from 'react-toastify';

export const useCartStore = create((set, get) => ({
    cart: [],
    totalPrice: 0,
    loading: false,

    // Get cart
    getCart: async () => {
        set({ loading: true });
        try {
            const { data } = await api.get('/cart');
            set({
                cart: data.data.products,
                totalPrice: data.data.totalPrice,
                loading: false
            });
        } catch (error) {
            set({ loading: false });
            console.error('Error fetching cart:', error);
        }
    },

    // Add to cart
    addToCart: async (product_id, quantity = 1) => {
        try {
            const { data } = await api.post('/cart/add', { product_id, quantity });
            toast.success('Đã thêm vào giỏ hàng!');
            await get().getCart(); // Refresh cart
            return data;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi thêm vào giỏ hàng');
            throw error;
        }
    },

    // Update quantity
    updateQuantity: async (product_id, quantity) => {
        try {
            await api.patch('/cart/update', { product_id, quantity });
            await get().getCart(); // Refresh cart
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi cập nhật số lượng');
            throw error;
        }
    },

    // Delete item
    deleteItem: async (productId) => {
        try {
            await api.delete(`/cart/delete/${productId}`);
            toast.success('Đã xóa sản phẩm khỏi giỏ hàng!');
            await get().getCart(); // Refresh cart
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi xóa sản phẩm');
            throw error;
        }
    },

    // Get cart count
    getCartCount: () => {
        const { cart } = get();
        return cart.reduce((total, item) => total + item.quantity, 0);
    }
}));
