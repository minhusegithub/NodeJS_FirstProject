import { create } from 'zustand';
import api from '../services/axios';

export const useProductStore = create((set) => ({
    products: [],
    featuredProducts: [],
    currentProduct: null,
    pagination: null,
    loading: false,
    error: null,

    // Get all products with filters (PostgreSQL API)
    getProducts: async (params = {}) => {
        set({ loading: true, error: null });
        try {
            // Default pagination for client view
            const queryParams = {
                page: params.page || 1,
                limit: params.limit || 9,
                ...params
            };
            const { data } = await api.get('/products', { params: queryParams });

            // PostgreSQL API returns { code, message, data, pagination }
            set({
                products: data.data || [],
                pagination: data.pagination || null,
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
            console.log('📡 API Call: GET /products/' + slug);
            const { data } = await api.get(`/products/${slug}`);
            console.log('✅ API Response:', data);
            // PostgreSQL API returns { code, message, data }
            set({
                currentProduct: data.data, // Product object directly
                loading: false
            });
        } catch (error) {
            console.error('❌ API Error:', error.response || error);
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
