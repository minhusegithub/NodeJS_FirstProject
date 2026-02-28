import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
                    <h2>
                        <span className="logo-mark" aria-hidden="true">
                            <i className="fa-solid fa-gauge-high"></i>
                        </span>
                        <span className="logo-text">Admin Panel</span>
                    </h2>
                </div>

                <nav className="admin-nav">
                    {/* Products menu - only for storeManager and InventoryStaff */}
                    {(userRoles.isSystemAdmin || userRoles.isStoreManager || userRoles.isInventoryStaff) && (
                        <NavLink to="/admin/products" end className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}>
                            <span className="nav-icon" aria-hidden="true">
                                <i className="fa-solid fa-box"></i>
                            </span>
                            <span className="nav-label">Sản phẩm</span>
                        </NavLink>
                    )}

                    {(userRoles.isStoreManager || userRoles.isInventoryStaff) && (
                        <NavLink to="/admin/products/import" end className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}>
                            <span className="nav-icon" aria-hidden="true">
                                <i className="fa-solid fa-truck-ramp-box"></i>
                            </span>
                            <span className="nav-label">Nhập hàng mới</span>
                        </NavLink>
                    )}

                    {/* ProductCategories menu - only for storeManager and InventoryStaff */}
                    {(userRoles.isSystemAdmin) && (
                        <NavLink to="/admin/product-categories" end className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}>
                            <span className="nav-icon" aria-hidden="true">
                                <i className="fa-solid fa-layer-group"></i>
                            </span>
                            <span className="nav-label">Danh mục sản phẩm</span>
                        </NavLink>
                    )}

                    {/* Orders menu - only for storeManager and OrderStaff */}
                    {(userRoles.isStoreManager || userRoles.isOrderStaff) && (
                        <NavLink to="/admin/orders" end className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}>
                            <span className="nav-icon" aria-hidden="true">
                                <i className="fa-solid fa-bag-shopping"></i>
                            </span>
                            <span className="nav-label">Đơn hàng</span>
                        </NavLink>
                    )}

                    {/* Store menu - different label based on role */}
                    {userRoles.isSystemAdmin && (
                        <NavLink to="/admin/stores" end className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}>
                            <span className="nav-icon" aria-hidden="true">
                                <i className="fa-solid fa-building"></i>
                            </span>
                            <span className="nav-label">Chuỗi cửa hàng</span>
                        </NavLink>
                    )}

                    {userRoles.isStoreManager && !userRoles.isSystemAdmin && (
                        <NavLink to="/admin/stores" end className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}>
                            <span className="nav-icon" aria-hidden="true">
                                <i className="fa-solid fa-store"></i>
                            </span>
                            <span className="nav-label">Cửa hàng</span>
                        </NavLink>
                    )}

                    {userRoles.isStoreManager && (
                        <NavLink to="/admin/accounts" end className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}>
                            <span className="nav-icon" aria-hidden="true">
                                <i className="fa-solid fa-users"></i>
                            </span>
                            <span className="nav-label">Tài khoản</span>
                        </NavLink>
                    )}
                </nav>

                <aside className="admin-sidebar-footer">
                    <div className="sidebar-footer-actions">
                        <button
                            className="btn-profile-sidebar"
                            onClick={() => setShowProfileModal(true)}
                            title="Xem thông tin cá nhân"
                        >
                            <i className="fa-regular fa-user" aria-hidden="true"></i>
                            <span>Thông tin cá nhân</span>
                        </button>
                        <button
                            className="btn-logout-sidebar"
                            onClick={handleLogout}
                            title="Đăng xuất tài khoản"
                        >
                            <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
                            <span>Đăng xuất</span>
                        </button>
                    </div>
                </aside>
            </aside>

            <div className="admin-main">
                <header className="admin-topbar">
                    <div className="admin-topbar-content">
                        <h3>Xin chào, {user?.fullName || 'Admin'}</h3>
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
