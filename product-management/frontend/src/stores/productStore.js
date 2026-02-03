import { create } from 'zustand';
import api from '../services/axios';

export const useProductStore = create((set) => ({
    products: [],
    featuredProducts: [],
    currentProduct: null,
    pagination: null,
    loading: false,
    error: null,

    // Get all products with filters
    getProducts: async (params = {}) => {
        set({ loading: true, error: null });
        try {
            const { data } = await api.get('/products', { params });
            set({
                products: data.data.products,
                pagination: data.data.pagination,
                loading: false
            });
        } catch (error) {
            set({
                error: error.response?.data?.message || 'Lỗi khi tải sản phẩm',
                loading: false
            });
        }
    },

    // Get featured products
    getFeaturedProducts: async () => {
        try {
            const { data } = await api.get('/products/featured');
            set({ featuredProducts: data.data.products });
        } catch (error) {
            console.error('Error fetching featured products:', error);
        }
    },

    // Get product by slug
    getProductBySlug: async (slug) => {
        set({ loading: true, error: null });
        try {
            const { data } = await api.get(`/products/${slug}`);
            set({
                currentProduct: data.data.product,
                loading: false
            });
        } catch (error) {
            set({
                error: error.response?.data?.message || 'Không tìm thấy sản phẩm',
                loading: false
            });
        }
    },

    // Clear current product
    clearCurrentProduct: () => {
        set({ currentProduct: null });
    }
}));
