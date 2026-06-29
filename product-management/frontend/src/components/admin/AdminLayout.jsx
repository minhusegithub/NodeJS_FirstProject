import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useMemo, useState, useEffect, useRef } from 'react';
import AdminProfileModal from './AdminProfileModal';
import logo from '../../assets/admin_logo.png';

const AdminLayout = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

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
                    <div className="admin-logo-inner">
                        <img src={logo} alt="MVN Admin" className="sidebar-logo-img" />
                    </div>
                </div>

                <nav className="admin-nav">
                    {/* Dashboard - for SystemAdmin and storeManager */}
                    {(userRoles.isSystemAdmin || userRoles.isStoreManager) && (
                        <div className="admin-nav-group">
                            <div className="admin-nav-parent">
                                <span className="nav-icon" aria-hidden="true">
                                    <i className="fa-solid fa-chart-line"></i>
                                </span>
                                <span className="nav-label">Dashboard</span>
                            </div>
                            <div className="admin-nav-submenu">
                                <NavLink to="/admin/dashboard/revenue" className={({ isActive }) => `admin-nav-subitem${isActive ? ' active' : ''}`}>
                                    <span className="subnav-label">Doanh thu - Bán chạy</span>
                                </NavLink>
                                <NavLink to="/admin/dashboard/fulfillment" className={({ isActive }) => `admin-nav-subitem${isActive ? ' active' : ''}`}>
                                    <span className="subnav-label">Phân tích vận hành đơn hàng</span>
                                </NavLink>
                                <NavLink to="/admin/dashboard/dead-stock" className={({ isActive }) => `admin-nav-subitem${isActive ? ' active' : ''}`}>
                                    <span className="subnav-label">Tồn kho chết</span>
                                </NavLink>

                            </div>
                        </div>
                    )}

                    {/* Transfer - also accessible by InventoryStaff */}
                    {(userRoles.isInventoryStaff || userRoles.isStoreManager) && (
                        <NavLink to="/admin/dashboard/transfer" end className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}>
                            <span className="nav-icon" aria-hidden="true">
                                <i className="fa-solid fa-truck-fast"></i>
                            </span>
                            <span className="nav-label">Luân chuyển tồn kho</span>
                        </NavLink>
                    )}

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
            </aside>

            <div className="admin-main">
                <header className="admin-topbar">
                    <div className="admin-topbar-content">
                        <div className="topbar-greeting">
                            <span className="topbar-welcome">Xin chào,</span>
                            <span className="topbar-name">{user?.fullName || 'Admin'}</span>
                        </div>

                        <div className="topbar-user" ref={dropdownRef}>
                            <button
                                className="topbar-avatar-btn"
                                onClick={() => setDropdownOpen(prev => !prev)}
                                title="Tài khoản của bạn"
                            >
                                <span className="topbar-avatar">
                                    {user?.avatar
                                        ? <img src={user.avatar} alt={user.fullName} className="topbar-avatar-img" />
                                        : (user?.fullName || 'A').charAt(0).toUpperCase()
                                    }
                                </span>
                                <span className="topbar-avatar-name">{user?.fullName || 'Admin'}</span>
                                <i className={`fa-solid fa-chevron-down topbar-chevron ${dropdownOpen ? 'open' : ''}`}></i>
                            </button>

                            {dropdownOpen && (
                                <div className="topbar-dropdown">
                                    <button
                                        className="topbar-dropdown-item"
                                        onClick={() => { setShowProfileModal(true); setDropdownOpen(false); }}
                                    >
                                        <i className="fa-regular fa-user"></i>
                                        <span>Thông tin cá nhân</span>
                                    </button>
                                    <div className="topbar-dropdown-divider" />
                                    <button
                                        className="topbar-dropdown-item danger"
                                        onClick={handleLogout}
                                    >
                                        <i className="fa-solid fa-right-from-bracket"></i>
                                        <span>Đăng xuất</span>
                                    </button>
                                </div>
                            )}
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
