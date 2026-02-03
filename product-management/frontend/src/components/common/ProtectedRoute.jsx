import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuthStore();

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Đang tải...</p>
            </div>
        );
    }

    return user ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
