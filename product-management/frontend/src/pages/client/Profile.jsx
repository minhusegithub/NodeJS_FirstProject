import { useAuthStore } from '../../stores/authStore';
import { Link } from 'react-router-dom';


const Profile = () => {
    const { user } = useAuthStore();

    if (!user) {
        return (
            <>
                <div className="container py-5 text-center">
                    <h2>Vui lòng đăng nhập để xem thông tin</h2>
                </div>
            </>
        );
    }

    // Default avatar if not exits
    const avatarUrl = user.avatar || "https://img.freepik.com/free-vector/businessman-character-avatar-isolated_24877-60111.jpg";

    return (
        <>
            <div className="user-info-page">
                <div className="container py-5">
                    <div className="row justify-content-center">
                        <div className="col-lg-10 col-xl-8 user-info-modal">
                            <div className="info-header mb-4" style={{ marginTop: "20px" }}>
                                <h1 className="page-title">
                                    <i className="fa-solid fa-circle-user me-2"></i>
                                    Thông tin tài khoản
                                </h1>
                            </div>

                            <div className="card info-card border-0 shadow-sm">
                                <div className="card-body p-4 p-md-5">
                                    <div className="row">
                                        <div className="col-md-4 text-center mb-4 mb-md-0">
                                            <div className="avatar-wrapper">
                                                <img
                                                    className="avatar-image"
                                                    src={avatarUrl}
                                                    alt="Avatar"
                                                />
                                                <div className="avatar-badge">
                                                    <i className="fa-solid fa-circle-check"></i>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-8">
                                            <div className="info-list">
                                                <div className="info-item">
                                                    <div className="info-label">
                                                        <i className="fa-solid fa-user me-2"></i>
                                                        Họ và tên
                                                    </div>
                                                    <div className="info-value">{user.fullName}</div>
                                                </div>

                                                <div className="info-item">
                                                    <div className="info-label">
                                                        <i className="fa-solid fa-envelope me-2"></i>
                                                        Email
                                                    </div>
                                                    <div className="info-value">{user.email}</div>
                                                </div>

                                                <div className="info-item">
                                                    <div className="info-label">
                                                        <i className="fa-solid fa-phone me-2"></i>
                                                        Số điện thoại
                                                    </div>
                                                    <div className="info-value">{user.phone || "Chưa cập nhật"}</div>
                                                </div>

                                                <div className="info-item">
                                                    <div className="info-label">
                                                        <i className="fa-solid fa-location-dot me-2"></i>
                                                        Địa chỉ
                                                    </div>
                                                    <div className="info-value">{user.address || "Chưa cập nhật"}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row mt-4">
                                        <div className="col-12 text-center text-md-right">
                                            <Link to="/user/edit" className="btn btn-edit btn-lg">

                                                Chỉnh sửa thông tin
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Profile;
