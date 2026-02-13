import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useMemo, useState } from 'react';
import AdminProfileModal from './AdminProfileModal';

const AdminLayout = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const [showProfileModal, setShowProfileModal] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Check user roles
    const userRoles = useMemo(() => {
        if (!user?.roles) return { isSystemAdmin: false, isStoreManager: false, isOrderStaff: false, isInventoryStaff: false };

        const isSystemAdmin = user.roles.some(r => r.roleName === 'SystemAdmin');
        const isStoreManager = user.roles.some(r => r.roleName === 'storeManager');
        const isOrderStaff = user.roles.some(r => r.roleName === 'OrderStaff');
        const isInventoryStaff = user.roles.some(r => r.roleName === 'InventoryStaff');

        return { isSystemAdmin, isStoreManager, isOrderStaff, isInventoryStaff };
    }, [user]);

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <h2>🛍️ Admin Panel</h2>
                </div>

                <nav className="admin-nav">
                    {/* Products menu - only for storeManager and InventoryStaff */}
                    {(userRoles.isSystemAdmin || userRoles.isStoreManager || userRoles.isInventoryStaff) && (
                        <Link to="/admin/products" className="admin-nav-item">
                            📦 Sản phẩm
                        </Link>
                    )}

                    {/* ProductCategories menu - only for storeManager and InventoryStaff */}
                    {(userRoles.isSystemAdmin) && (
                        <Link to="/admin/product-categories" className="admin-nav-item">
                            📦 Danh mục sản phẩm
                        </Link>
                    )}

                    {/* Orders menu - only for storeManager and OrderStaff */}
                    {(userRoles.isStoreManager || userRoles.isOrderStaff) && (
                        <Link to="/admin/orders" className="admin-nav-item">
                            🛒 Đơn hàng
                        </Link>
                    )}

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

                    {userRoles.isStoreManager && (
                        <Link to="/admin/accounts" className="admin-nav-item">
                            👥 Tài khoản
                        </Link>
                    )}
                </nav>

            </aside>

            <div className="admin-main">
                <header className="admin-topbar">
                    <div className="admin-topbar-content">
                        <h3>Xin chào, {user?.fullName || 'Admin'}</h3>
                        <div className="topbar-actions">
                            <button
                                className="btn-profile"
                                onClick={() => setShowProfileModal(true)}

                            >
                                👤 Thông tin cá nhân
                            </button>
                            <button className="btn-logout" onClick={handleLogout}>
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </header>

                <main className="admin-content">
                    <Outlet />
                </main>

                {/* Profile Modal Integration */}
                <AdminProfileModal
                    isOpen={showProfileModal}
                    onClose={() => setShowProfileModal(false)}
                />
            </div>
        </div>
    );
};


export default AdminLayout;
