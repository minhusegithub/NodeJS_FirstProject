import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'react-toastify';

const Login = () => {
    const navigate = useNavigate();
    const { login, user } = useAuthStore();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await login(formData.email, formData.password);
            toast.success('Đăng nhập thành công!');

            // Check roles for redirection
            const user = useAuthStore.getState().user;
            if (user?.roles && user.roles.length > 0) {
                navigate('/admin/dashboard');
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
        <div className="login-page">
            <div className="container">
                <div className="row justify-content-center align-items-center min-vh-100">
                    <div className="col-12 col-sm-6 col-md-5 col-lg-4">
                        <div className="card border-0 shadow rounded-4">
                            <div className="card-body p-4">
                                <div className="text-center mb-4">
                                    <h2 className="fw-bold text-primary">Đăng nhập</h2>
                                </div>

                                <form onSubmit={handleSubmit} autoComplete="off">
                                    <div className="form-group mb-3">
                                        <input
                                            type="email"
                                            className="form-control form-control-lg rounded-3 border-0 bg-light"
                                            id="email"
                                            name="email"
                                            placeholder="Email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            autoComplete="email"
                                        />
                                    </div>

                                    <div className="form-group mb-3">
                                        <input
                                            type="password"
                                            className="form-control form-control-lg rounded-3 border-0 bg-light"
                                            id="password"
                                            name="password"
                                            placeholder="Mật khẩu"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            autoComplete="current-password"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary btn-lg w-100 rounded-3 mb-3"
                                        disabled={loading}
                                    >
                                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                                    </button>

                                    <div className="text-center mb-3">
                                        <a href="#" className="text-decoration-none text-primary">
                                            Quên mật khẩu?
                                        </a>
                                    </div>

                                    <div className="text-center">
                                        <Link to="/register" className="btn btn-success btn-lg w-100 rounded-3 mb-3">
                                            Tạo tài khoản mới
                                        </Link>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
