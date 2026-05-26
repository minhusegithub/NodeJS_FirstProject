import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'react-toastify';
import logoImg from '../../assets/logo.png';
import heroBg from '../../assets/hero-bg.png';

const Register = () => {
    const navigate = useNavigate();
    const { register, user } = useAuthStore();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        phone: ''
    });
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
        if (formData.password.length < 6) {
            toast.error('Mật khẩu phải có ít nhất 6 ký tự!');
            return;
        }
        setLoading(true);
        try {
            await register(formData);
            toast.success('Đăng ký thành công!');
            navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Đăng ký thất bại!');
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
                        Tham gia cùng<br />
                        <span>10.000+ khách hàng</span>
                    </p>
                    <p className="auth-panel-sub">
                        Đăng ký ngay để trải nghiệm mua sắm hiện đại, theo dõi đơn hàng và nhận ưu đãi độc quyền từ MVN Shop.
                    </p>
                </div>
            </div>

            {/* RIGHT — Form panel */}
            <div className="auth-panel-right">
                <div className="auth-form-header">
                    <h1 className="auth-form-title">Tạo tài khoản</h1>

                </div>

                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="auth-field">
                        <label htmlFor="fullName">Họ và tên</label>
                        <input
                            id="fullName"
                            type="text"
                            name="fullName"
                            className="auth-input"
                            placeholder="Nguyễn Văn A"
                            value={formData.fullName}
                            onChange={handleChange}
                            required
                            autoComplete="name"
                        />
                    </div>

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
                        <label htmlFor="phone">Số điện thoại</label>
                        <input
                            id="phone"
                            type="tel"
                            name="phone"
                            className="auth-input"
                            placeholder="0901 234 567"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            autoComplete="tel"
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
                                placeholder="Tối thiểu 6 ký tự"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength="6"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="auth-eye-btn"
                                onClick={() => setShowPwd(!showPwd)}
                                tabIndex={-1}
                            >
                                {showPwd ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="auth-btn-primary" disabled={loading}>
                        {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản mới'}
                    </button>
                </form>

                <div className="auth-link-row">
                    Đã có tài khoản?{' '}
                    <Link to="/login" className="auth-link">Đăng nhập ngay</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
