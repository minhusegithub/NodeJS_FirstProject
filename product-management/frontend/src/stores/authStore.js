import { create } from 'zustand';
import api from '../services/axios';

export const useAuthStore = create((set) => ({
    user: null,
    loading: true,

    // Check if user is authenticated
    checkAuth: async () => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            try {
                const { data } = await api.get('/auth/profile');
                set({ user: data.data.user, loading: false });
            } catch (error) {
                localStorage.removeItem('accessToken');
                set({ user: null, loading: false });
            }
        } else {
            set({ loading: false });
        }
    },

    // Login user
    login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        // Only store access token - refresh token is in HttpOnly cookie
        localStorage.setItem('accessToken', data.data.accessToken);
        set({ user: data.data.user });
        return data;
    },

    // Register user
    register: async (userData) => {
        const { data } = await api.post('/auth/register', userData);
        localStorage.setItem('accessToken', data.data.accessToken);
        set({ user: data.data.user });
        return data;
    },

    // Logout user
    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        }
        localStorage.removeItem('accessToken');
        set({ user: null });
    },

    // Update user profile
    updateProfile: async (info) => {
        const { data } = await api.patch('/user/info', info);
        set((state) => ({
            user: { ...state.user, ...data.data.user }
        }));
        return data;
    },

    updateUser: (userData) => {
        set({ user: userData });
    }
}));
