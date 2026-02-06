import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/axios';
import '../../assets/styles/profile.css';

const Profile = () => {
    const { user } = useAuthStore();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);

            // Use api instance which handles Authorization header & token refresh automatically
            const response = await api.get('/user/profile');
            const data = response.data;

            if (data.code === 200) {
                setProfile(data.data);
            } else {
                setError(data.message || 'Không thể tải thông tin');
            }
        } catch (err) {
            console.error('Fetch profile error:', err);
            // Error handled by axios interceptor (e.g. redirect to login if refresh fails)
            // But we can show error state here if needed
            if (err.response?.status === 401) {
                setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
            } else {
                setError(err.response?.data?.message || 'Lỗi kết nối server');
            }
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getPermissionLabel = (permission) => {
        const labels = {
            'manage_store': 'Quản lý cửa hàng',
            'view_orders': 'Xem đơn hàng',
            'manage_orders': 'Quản lý đơn hàng',
            'manage_products': 'Quản lý sản phẩm',
            'view_products': 'Xem sản phẩm',
            'manage_staff': 'Quản lý nhân viên',
            'view_reports': 'Xem báo cáo',
            'manage_inventory': 'Quản lý kho',
            'system_admin': 'Quản trị hệ thống'
        };
        return labels[permission] || permission;
    };

    if (loading) {
        return (
            <div className="profile-page">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Đang tải thông tin...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="profile-page">
                <div className="error-container">
                    <p className="error-message">{error}</p>
                    {error.includes('hết hạn') || error.includes('đăng nhập') ? (
                        <button className="btn-retry" onClick={() => window.location.href = '/login'}>Đăng nhập lại</button>
                    ) : (
                        <button className="btn-retry" onClick={fetchProfile}>Thử lại</button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <div className="profile-container">
                <h1 className="profile-title">Thông tin cá nhân</h1>

                {/* User Info Card */}
                <div className="profile-card">
                    <div className="profile-header">
                        <div className="profile-avatar">
                            {profile?.avatar ? (
                                <img src={profile.avatar} alt={profile.fullName} />
                            ) : (
                                <div className="avatar-placeholder">
                                    {profile?.fullName?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="profile-header-info">
                            <h2>{profile?.fullName}</h2>
                            <p className="profile-email">{profile?.email}</p>
                            <span className={`status-badge ${profile?.status}`}>
                                {profile?.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                            </span>
                        </div>
                    </div>

                    <div className="profile-details">
                        <div className="detail-row">
                            <span className="detail-label">📧 Email:</span>
                            <span className="detail-value">{profile?.email || 'Chưa cập nhật'}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">📱 Số điện thoại:</span>
                            <span className="detail-value">{profile?.phone || 'Chưa cập nhật'}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">📍 Địa chỉ:</span>
                            <span className="detail-value">{profile?.address || 'Chưa cập nhật'}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">📅 Ngày tạo:</span>
                            <span className="detail-value">{formatDate(profile?.createdAt)}</span>
                        </div>
                    </div>
                </div>

                {/* Roles & Permissions */}
                <div className="roles-section">
                    <h2 className="section-title">Vai trò & Quyền hạn</h2>

                    {profile?.roles && profile.roles.length > 0 ? (
                        <div className="roles-grid">
                            {profile.roles.map((role, index) => (
                                <div key={index} className="role-card">
                                    <div className="role-header">
                                        <h3 className="role-name">{role.roleName}</h3>
                                        <span className={`role-scope-badge ${role.roleScope}`}>
                                            {role.roleScope === 'system' ? 'Hệ thống' : 'Cửa hàng'}
                                        </span>
                                    </div>

                                    {role.roleDescription && (
                                        <p className="role-description">{role.roleDescription}</p>
                                    )}

                                    {role.storeName && (
                                        <div className="role-store-info">
                                            <strong>🏢 Cửa hàng:</strong> {role.storeName}
                                            {role.storeAddress && (
                                                <div className="store-address">{role.storeAddress}</div>
                                            )}
                                        </div>
                                    )}

                                    <div className="permissions-section">
                                        <h4>Quyền hạn:</h4>
                                        {role.permissions && role.permissions.length > 0 ? (
                                            <div className="permissions-list">
                                                {role.permissions.map((permission, pIndex) => (
                                                    <span key={pIndex} className="permission-badge">
                                                        ✓ {getPermissionLabel(permission)}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="no-permissions">Không có quyền hạn cụ thể</p>
                                        )}
                                    </div>

                                    <div className="role-footer">
                                        <small>Được gán: {formatDate(role.assignedAt)}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-roles">
                            <p>Bạn chưa được gán vai trò nào</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
