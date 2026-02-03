import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const AdminLayout = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <h2>🛍️ Admin Panel</h2>
                </div>

                <nav className="admin-nav">
                    <Link to="/admin/dashboard" className="admin-nav-item">
                        📊 Dashboard
                    </Link>
                    <Link to="/admin/products" className="admin-nav-item">
                        📦 Sản phẩm
                    </Link>
                    <Link to="/admin/orders" className="admin-nav-item">
                        🛒 Đơn hàng
                    </Link>
                </nav>

                <div className="admin-sidebar-footer">
                    <Link to="/" className="admin-nav-item">
                        🏠 Về trang chủ
                    </Link>
                </div>
            </aside>

            <div className="admin-main">
                <header className="admin-topbar">
                    <div className="admin-topbar-content">
                        <h3>Xin chào, Admin</h3>
                        <button className="btn-logout" onClick={handleLogout}>
                            Đăng xuất
                        </button>
                    </div>
                </header>

                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
