import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'react-toastify';
import logoImg from '../../assets/logo.png';
import heroBg from '../../assets/hero-bg.png';

const Login = () => {
    const navigate = useNavigate();
    const { login, user } = useAuthStore();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    useEffect(() => {
        if (user) navigate('/');
    }, [user, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(formData.email, formData.password);
            toast.success('Đăng nhập thành công!');
            const currentUser = useAuthStore.getState().user;
            if (currentUser?.roles?.length > 0) {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Đăng nhập thất bại!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-split">
            {/* LEFT — Hero panel */}
            <div className="auth-panel-left" style={{ backgroundImage: `url(${heroBg})` }}>
                <Link to="/" className="auth-panel-left-logo">
                    <img src={logoImg} alt="MVN Shop" />
                    <span>MVN Shop</span>
                </Link>
                <div className="auth-panel-left-content">
                    <p className="auth-panel-quote">
                        Mua sắm thông minh cùng<br />
                        <span> MVN Shop</span>
                    </p>
                    <p className="auth-panel-sub">
                        Hệ thống chuỗi cửa hàng hiện đại — kết nối sản phẩm chất lượng đến tay bạn một cách nhanh chóng và đáng tin cậy.
                    </p>
                </div>
            </div>

            {/* RIGHT — Form panel */}
            <div className="auth-panel-right">
                <div className="auth-form-header">
                    <h1 className="auth-form-title">Đăng nhập</h1>

                </div>

                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="auth-field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            className="auth-input"
                            placeholder="example@gmail.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="password">Mật khẩu</label>
                        <div className="auth-input-wrapper">
                            <input
                                id="password"
                                type={showPwd ? 'text' : 'password'}
                                name="password"
                                className="auth-input"
                                placeholder="Nhập mật khẩu"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="auth-eye-btn"
                                onClick={() => setShowPwd(!showPwd)}
                                tabIndex={-1}
                            >
                                {showPwd ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right', marginBottom: '0.75rem' }}>
                        <Link to="/forgot-password" className="auth-link">Quên mật khẩu?</Link>
                    </div>

                    <button type="submit" className="auth-btn-primary" disabled={loading}>
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                </form>

                <div className="auth-divider">hoặc</div>

                <Link to="/register" className="auth-btn-secondary">
                    Tạo tài khoản mới
                </Link>
            </div>
        </div>
    );
};

export default Login;
