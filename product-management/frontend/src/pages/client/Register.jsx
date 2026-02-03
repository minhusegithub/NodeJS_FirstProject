import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'react-toastify';

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
        <div className="register-page">
            <div className="container">
                <div className="row justify-content-center align-items-center min-vh-100">
                    <div className="col-11 col-sm-6 col-md-5 col-lg-4">
                        <div className="card border-0 shadow rounded-4">
                            <div className="card-body p-4">
                                <div className="text-center mb-4">
                                    <h2 className="fw-bold register-css">Đăng Ký</h2>
                                </div>

                                <form onSubmit={handleSubmit} autoComplete="off">
                                    <div className="form-group mb-3">
                                        <input
                                            type="text"
                                            className="form-control form-control-lg rounded-3 border-0 bg-light"
                                            id="fullName"
                                            name="fullName"
                                            placeholder="Họ và tên"
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            required
                                            autoComplete="name"
                                        />
                                    </div>

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
                                            type="tel"
                                            className="form-control form-control-lg rounded-3 border-0 bg-light"
                                            id="phone"
                                            name="phone"
                                            placeholder="Số điện thoại"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            required
                                            autoComplete="tel"
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
                                            minLength="6"
                                            autoComplete="new-password"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-success btn-lg w-100 rounded-3 mb-3"
                                        disabled={loading}
                                    >
                                        {loading ? 'Đang đăng ký...' : 'Tạo tài khoản mới'}
                                    </button>

                                    <div className="text-center">
                                        <Link to="/login" className="btn btn-primary btn-lg w-100 rounded-3">
                                            Đăng nhập
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

export default Register;
