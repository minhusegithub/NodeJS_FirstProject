import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useMemo } from 'react';

const AdminLayout = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Check user roles
    const userRoles = useMemo(() => {
        if (!user?.roles) return { isSystemAdmin: false, isStoreManager: false };

        const isSystemAdmin = user.roles.some(r => r.roleName === 'SystemAdmin');
        const isStoreManager = user.roles.some(r => r.roleName === 'storeManager');

        return { isSystemAdmin, isStoreManager };
    }, [user]);

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <h2>🛍️ Admin Panel</h2>
                </div>

                <nav className="admin-nav">
                    <Link to="/admin/products" className="admin-nav-item">
                        📦 Sản phẩm
                    </Link>
                    <Link to="/admin/orders" className="admin-nav-item">
                        🛒 Đơn hàng
                    </Link>

                    {/* Store menu - different label based on role */}
                    {userRoles.isSystemAdmin && (
                        <Link to="/admin/stores" className="admin-nav-item">
                            🏢 Chuỗi cửa hàng
                        </Link>
                    )}

                    {userRoles.isStoreManager && !userRoles.isSystemAdmin && (
                        <Link to="/admin/stores" className="admin-nav-item">
                            🏢 Cửa hàng
                        </Link>
                    )}
                </nav>

            </aside>

            <div className="admin-main">
                <header className="admin-topbar">
                    <div className="admin-topbar-content">
                        <h3>Xin chào, {user?.fullName || 'Admin'}</h3>
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
