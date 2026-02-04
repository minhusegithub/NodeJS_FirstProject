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
            // Backend returns { data: { items: [], total_price: 0 } }
            set({
                cart: data.data.items || [],
                totalPrice: data.data.total_price || 0,
                loading: false
            });
        } catch (error) {
            set({ loading: false, cart: [] });
            console.error('Error fetching cart:', error);
        }
    },

    // Add to cart (with inventory_id from specific store)
    addToCart: async (inventory_id, quantity = 1) => {
        try {
            const { data } = await api.post('/cart/add', { inventory_id, quantity });
            toast.success('Đã thêm vào giỏ hàng!');
            await get().getCart(); // Refresh cart
            return data;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi thêm vào giỏ hàng');
            throw error;
        }
    },

    // Update quantity
    updateCartItem: async (cart_item_id, quantity) => {
        try {
            await api.patch('/cart/update', { cart_item_id, quantity });
            await get().getCart(); // Refresh cart
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi cập nhật số lượng');
            throw error;
        }
    },

    // Delete item
    removeCartItem: async (cart_item_id) => {
        try {
            await api.delete(`/cart/remove/${cart_item_id}`);
            toast.success('Đã xóa sản phẩm khỏi giỏ hàng!');
            await get().getCart(); // Refresh cart
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi xóa sản phẩm');
            throw error;
        }
    },

    // Clear cart
    clearCart: async () => {
        try {
            await api.delete('/cart/clear');
            set({ cart: [], totalPrice: 0 });
            toast.success('Đã xóa toàn bộ giỏ hàng!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi xóa giỏ hàng');
            throw error;
        }
    },

    // Selection Logic
    selectedItems: [], // Array of cart_item_ids

    toggleItemSelection: (cartItemId) => {
        const { selectedItems } = get();
        const index = selectedItems.indexOf(cartItemId);
        if (index > -1) {
            set({ selectedItems: selectedItems.filter(id => id !== cartItemId) });
        } else {
            set({ selectedItems: [...selectedItems, cartItemId] });
        }
    },

    toggleSelectAll: (checked) => {
        const { cart } = get();
        if (checked) {
            set({ selectedItems: cart.map(item => item.id) });
        } else {
            set({ selectedItems: [] });
        }
    },

    // Get selected total price
    getSelectedTotal: () => {
        const { cart, selectedItems } = get();
        if (!Array.isArray(cart)) return 0;

        return cart.reduce((total, item) => {
            if (selectedItems.includes(item.id)) {
                const price = item.product.price * (100 - (item.product.discount_percentage || 0)) / 100;
                return total + (price * item.quantity);
            }
            return total;
        }, 0);
    },

    // Get cart count
    getCartCount: () => {
        const { cart } = get();
        return Array.isArray(cart) ? cart.reduce((total, item) => total + item.quantity, 0) : 0;
    }
}));
