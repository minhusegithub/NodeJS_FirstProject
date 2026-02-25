import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
    timeout: 10000,
    withCredentials: true // Important for HttpOnly cookies
});

// ─── Prevent concurrent refresh race condition ───────────────────────────────
let isRefreshing = false;
let refreshQueue = []; // Queue các requests đang chờ token mới

const processQueue = (error, token = null) => {
    refreshQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve(token);
    });
    refreshQueue = [];
};
// ─────────────────────────────────────────────────────────────────────────────

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

// ─── Danh sách endpoint KHÔNG cần auto-refresh ──────────────────────────────
const SKIP_REFRESH_URLS = ['/auth/login', '/auth/register', '/auth/refresh-token', '/auth/forgot-password'];
const shouldSkipRefresh = (url = '') => SKIP_REFRESH_URLS.some(path => url.includes(path));
// ─────────────────────────────────────────────────────────────────────────────

// Response interceptor - handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;

        // Chỉ xử lý 401 — bỏ qua: non-401, retry lần 2, hoặc auth endpoints
        if (
            status !== 401 ||
            originalRequest?._retry ||
            shouldSkipRefresh(originalRequest?.url)
        ) {
            return Promise.reject(error);
        }

        // Mark this request as being retried (prevent infinite loop)
        originalRequest._retry = true;

        // Nếu đang refresh → đưa request vào queue, chờ kết quả
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                refreshQueue.push({ resolve, reject });
            }).then((newToken) => {
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                return api(originalRequest);
            }).catch((err) => {
                return Promise.reject(err);
            });
        }

        isRefreshing = true;

        try {
            // Gọi refresh-token (RT gửi tự động qua HttpOnly cookie)
            const { data } = await axios.post(
                `${api.defaults.baseURL}/auth/refresh-token`,
                {},
                { withCredentials: true }
            );

            const newAccessToken = data?.data?.accessToken;
            if (!newAccessToken) {
                throw new Error('No access token in refresh response');
            }

            // Lưu token mới
            localStorage.setItem('accessToken', newAccessToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

            // Cập nhật user data từ refresh response (không cần gọi thêm /profile)
            if (data?.data?.user) {
                try {
                    const { useAuthStore } = await import('../stores/authStore');
                    useAuthStore.getState().updateUser(data.data.user);
                } catch (err) {
                    console.error('Failed to update user store:', err);
                }
            }

            // Giải phóng queue
            processQueue(null, newAccessToken);

            // Retry request ban đầu với token mới
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return api(originalRequest);

        } catch (refreshError) {
            const refreshCode = refreshError.response?.data?.code;
            processQueue(refreshError, null);
            localStorage.removeItem('accessToken');

            // Phát hiện token bị đánh cắp (reuse detection)
            if (refreshCode === 'REUSE_DETECTED') {
                console.warn('⚠️ Security violation: Refresh token reuse detected. Force logout.');
            }

            // Force logout + redirect
            try {
                const { useAuthStore } = await import('../stores/authStore');
                useAuthStore.getState().clearUser();
            } catch (_) { /* ignore */ }

            window.location.href = '/login';
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default api;
