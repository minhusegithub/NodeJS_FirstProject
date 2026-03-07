import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { useEffect } from 'react';

const Header = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const { getCart, getCartCount } = useCartStore();
    const cartCount = getCartCount();

    useEffect(() => {
        if (user) {
            getCart();
        }
    }, [user, getCart]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <header className="header">
            <div className="container">
                <div className="header-content">
                    <Link to="/" className="logo">
                        🛍️ MVN Shop
                    </Link>

                    <nav className="nav">
                        <Link to="/">Trang chủ</Link>
                        <Link to="/products">Sản phẩm</Link>
                        {user && (
                            <>
                                <Link to="/orders">Đơn hàng</Link>
                                <Link to="/cart" className="cart-link">
                                    🛒 Giỏ hàng
                                    {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                                </Link>
                            </>
                        )}
                    </nav>

                    <div className="header-actions">
                        {user ? (
                            <>
                                <Link to="/profile" className="user-name text-decoration-none fw-bold mr-3">
                                    {user.fullName}
                                </Link>
                                <button className="btn-logout" onClick={handleLogout}>
                                    Đăng xuất
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="btn-login">Đăng nhập</Link>
                                <Link to="/register" className="btn-register">Đăng ký</Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
