import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
    timeout: 10000,
    withCredentials: true // Important for HttpOnly cookies
});

// Request interceptor - add JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Refresh token is automatically sent via HttpOnly cookie
                const { data } = await axios.post(
                    `${api.defaults.baseURL}/auth/refresh-token`,
                    {}, // Empty body - refresh token comes from cookie
                    { withCredentials: true } // Important: send cookies
                );

                // Update access token in localStorage
                localStorage.setItem('accessToken', data.data.accessToken);
                originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;

                // Sync user profile after successful token refresh
                try {
                    const profileResponse = await axios.get(
                        `${api.defaults.baseURL}/auth/profile`,
                        {
                            headers: { Authorization: `Bearer ${data.data.accessToken}` },
                            withCredentials: true
                        }
                    );

                    // Update user in authStore if available
                    if (profileResponse.data?.data?.user) {
                        // Dynamically import to avoid circular dependency
                        import('../stores/authStore').then(({ useAuthStore }) => {
                            useAuthStore.getState().updateUser(profileResponse.data.data.user);
                        });
                    }
                } catch (profileError) {
                    console.warn('Failed to sync user profile after token refresh:', profileError);
                }

                return api(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem('accessToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
