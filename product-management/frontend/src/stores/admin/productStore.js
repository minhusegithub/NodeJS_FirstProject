import { create } from 'zustand';
import api from '../../services/axios';
import { toast } from 'react-toastify';

export const useAdminProductStore = create((set, get) => ({
    products: [],
    currentProduct: null,
    pagination: null,
    loading: false,

    getProducts: async (params = {}) => {
        set({ loading: true });
        try {
            const { data } = await api.get('/admin/products', { params });
            set({
                products: data.data.products,
                pagination: data.data.pagination,
                loading: false
            });
        } catch (error) {
            set({ loading: false });
            toast.error('Lỗi khi tải sản phẩm');
        }
    },

    getProduct: async (id) => {
        set({ loading: true });
        try {
            const { data } = await api.get(`/admin/products/${id}`);
            set({
                currentProduct: data.data.product,
                loading: false
            });
            return data.data.product;
        } catch (error) {
            set({ loading: false });
            toast.error('Không tìm thấy sản phẩm');
            throw error;
        }
    },

    createProduct: async (productData) => {
        try {
            const { data } = await api.post('/admin/products', productData);
            toast.success('Tạo sản phẩm thành công!');
            await get().getProducts();
            return data.data.product;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi tạo sản phẩm');
            throw error;
        }
    },

    updateProduct: async (id, productData) => {
        try {
            const { data } = await api.put(`/admin/products/${id}`, productData);
            toast.success('Cập nhật sản phẩm thành công!');
            await get().getProducts();
            return data.data.product;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi cập nhật sản phẩm');
            throw error;
        }
    },







    clearCurrentProduct: () => {
        set({ currentProduct: null });
    }
}));
