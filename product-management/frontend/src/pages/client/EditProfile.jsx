import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'react-toastify';

const EditProfile = () => {
    const navigate = useNavigate();
    const { user, updateProfile } = useAuthStore();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        address: '',
        password: '',
        avatar: ''
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [previewAvatar, setPreviewAvatar] = useState(null);

    useEffect(() => {
        if (user) {
            setFormData({
                fullName: user.fullName || '',
                email: user.email || '',
                phone: user.phone || '',
                address: user.address || '',
                password: '',
                avatar: user.avatar || ''
            });
            setPreviewAvatar(user.avatar);
        } else {
            navigate('/login');
        }
    }, [user, navigate]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setPreviewAvatar(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = new FormData();
            Object.keys(formData).forEach(key => payload.append(key, formData[key]));
            if (avatarFile) payload.append('avatar', avatarFile);

            await updateProfile(payload);
            toast.success('Cập nhật thông tin thành công!');
            navigate('/profile');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Cập nhật thất bại!');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    const displayAvatar = previewAvatar || formData.avatar || "https://img.freepik.com/free-vector/businessman-character-avatar-isolated_24877-60111.jpg";

    return (
        <div className="user-edit-page">
            <div className="container py-5">
                <div className="row justify-content-center">
                    <div className="col-lg-10 col-xl-8 user-edit-card">
                        <div className="info-header mb-4" style={{ marginTop: '20px' }}>
                            <h1 className="page-title">
                                <i className="fa-solid fa-pen-to-square me-2"></i>
                                Chỉnh sửa thông tin
                            </h1>
                        </div>

                        <div className="card edit-card border-0 shadow-sm">
                            <div className="card-body p-4 p-md-5">
                                <form onSubmit={handleSubmit}>
                                    <div className="row mb-4">
                                        <div className="col-12 text-center">
                                            <div className="avatar-upload">
                                                <img
                                                    className="avatar-edit-image"
                                                    src={displayAvatar}
                                                    alt="Avatar Preview"
                                                    style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '50%' }}
                                                />
                                                <div className="mt-2">
                                                    <label className="btn btn-upload" htmlFor="avatar-input" style={{ cursor: 'pointer' }}>
                                                        <i className="fa-solid fa-camera me-2"></i>
                                                        Chọn ảnh
                                                    </label>
                                                    <input
                                                        id="avatar-input"
                                                        type="file"
                                                        className="d-none"
                                                        accept="image/*"
                                                        onChange={handleFileChange}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-section">
                                        <div className="form-group mb-4">
                                            <label className="form-label" htmlFor="fullName">
                                                <i className="fa-solid fa-user me-2"></i>
                                                Họ và tên
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control form-control-lg"
                                                id="fullName"
                                                name="fullName"
                                                value={formData.fullName}
                                                onChange={handleChange}
                                                required
                                                placeholder="Nhập họ và tên"
                                            />
                                        </div>

                                        <div className="form-group mb-4">
                                            <label className="form-label" htmlFor="email">
                                                <i className="fa-solid fa-envelope me-2"></i>
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                className="form-control form-control-lg"
                                                id="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                                placeholder="Nhập email"
                                            />
                                        </div>

                                        <div className="form-group mb-4">
                                            <label className="form-label" htmlFor="phone">
                                                <i className="fa-solid fa-phone me-2"></i>
                                                Số điện thoại
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control form-control-lg"
                                                id="phone"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                placeholder="Nhập số điện thoại"
                                            />
                                        </div>

                                        <div className="form-group mb-4">
                                            <label className="form-label" htmlFor="address">
                                                <i className="fa-solid fa-location-dot me-2"></i>
                                                Địa chỉ
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control form-control-lg"
                                                id="address"
                                                name="address"
                                                value={formData.address}
                                                onChange={handleChange}
                                                placeholder="Nhập địa chỉ"
                                            />
                                        </div>

                                        <div className="form-group mb-4">
                                            <label className="form-label" htmlFor="password">
                                                <i className="fa-solid fa-lock me-2"></i>
                                                Mật khẩu mới (để trống nếu không đổi)
                                            </label>
                                            <input
                                                type="password"
                                                className="form-control form-control-lg"
                                                id="password"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                placeholder="Nhập mật khẩu mới"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-actions mt-5">
                                        <div className="row g-3">
                                            <div className="col-md-6 mb-3 mb-md-0">
                                                <Link to="/profile" className="btn btn-cancel btn-lg w-100">

                                                    Quay lại
                                                </Link>
                                            </div>
                                            <div className="col-md-6">
                                                <button type="submit" className="btn btn-submit btn-lg w-100" disabled={loading}>
                                                    {loading ? (
                                                        <>

                                                            Đang cập nhật...
                                                        </>
                                                    ) : (
                                                        <>

                                                            Cập nhật
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
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

export default EditProfile;
