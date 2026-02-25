import { useState, useEffect } from 'react';
import api from '../../services/axios';

const AdminProfileModal = ({ isOpen, onClose }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchProfile();
        }
    }, [isOpen]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/user/profile');
            
            // Backend /user/profile trả: { code: 200, message: 'Success', data: {...profileData} }
            if (response.data?.code === 200 && response.data?.data) {
                setProfile(response.data.data);
            } else {
                setError(response.data?.message || 'Lỗi server: Định dạng response sai');
            }
        } catch (err) {
            console.error('Profile Load Error:', err);
            
            // Safe access error response
            const errorCode = err.response?.data?.code;
            const errorMessage = err.response?.data?.message;
            const fallbackMessage = err.message || 'Không thể tải thông tin.';
            
            const msg = errorMessage || fallbackMessage;
            setError(`Lỗi: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="admin-modal-overlay" onClick={onClose}>
            <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
                <button className="admin-modal-close" onClick={onClose}>&times;</button>

                {loading ? (
                    <div className="modal-loading">
                        <div className="spinner"></div>
                        <p>Đang tải hồ sơ...</p>
                    </div>
                ) : error ? (
                    <div className="modal-error">
                        <p>{error}</p>
                        <button className="btn-retry" onClick={fetchProfile}>Thử lại</button>
                    </div>
                ) : profile ? (
                    <div className="profile-layout">
                        {/* Header Section */}
                        <div className="modal-header-profile">
                            <div className="avatar-circle">
                                {profile.avatar ? (
                                    <img src={profile.avatar} alt="Avatar" />
                                ) : (
                                    <span>{profile.fullName?.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <div className="header-info">
                                <h3>{profile.fullName}</h3>
                                <p className="email-text">{profile.email}</p>
                                <span className={`status-pill ${profile.status}`}>
                                    {profile.status === 'active' ? '● Đang hoạt động' : '● Vô hiệu hóa'}
                                </span>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="modal-section">
                            <h4>Thông tin liên hệ</h4>
                            <div className="details-grid">
                                <div className="detail-item">
                                    <label>Số điện thoại</label>
                                    <p>{profile.phone || '---'}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Địa chỉ</label>
                                    <p>{profile.address || '---'}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Ngày tham gia</label>
                                    <p>{new Date(profile.createdAt).toLocaleDateString('vi-VN')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Roles Section */}
                        <div className="modal-section">
                            <h4>Vai trò & Quyền hạn</h4>
                            <div className="roles-list-container">
                                {profile.roles?.length > 0 ? profile.roles.map((role, idx) => (
                                    <div key={idx} className="role-chip-card">
                                        <div className="role-chip-header">
                                            <span className="role-title">{role.roleName}</span>
                                            <span className={`scope-badge ${role.roleScope}`}>
                                                {role.roleScope === 'system' ? 'Hệ thống' : 'Cửa hàng'}
                                            </span>
                                        </div>
                                        {role.storeName && (
                                            <div className="store-info-row">
                                                {role.storeName}
                                            </div>
                                        )}
                                        {role.permissions?.length > 0 && (
                                            <div className="perm-preview">
                                                Quản lý: {role.permissions.map(p => p).join(', ').substring(0, 50)}...
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <p className="empty-text">Chưa được gán vai trò nào.</p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            <style jsx>{`
                .admin-modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIn 0.2s ease-out;
                }
                .admin-modal-content {
                    background: white;
                    width: 90%;
                    max-width: 500px;
                    border-radius: 16px;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.3);
                    position: relative;
                    overflow: hidden;
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    max-height: 90vh;
                    overflow-y: auto;
                }
                .admin-modal-close {
                    position: absolute;
                    top: 15px;
                    right: 20px;
                    font-size: 28px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #666;
                    z-index: 10;
                    transition: color 0.2s;
                }
                .admin-modal-close:hover { color: #000; }
                
                .modal-loading, .modal-error {
                    padding: 40px;
                    text-align: center;
                }
                .spinner {
                    width: 30px; height: 30px;
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 15px;
                }
                
                .modal-header-profile {
                    background: linear-gradient(135deg, #f6f8fd 0%, #f1f4f9 100%);
                    padding: 30px 25px;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    border-bottom: 1px solid #eee;
                }
                .avatar-circle {
                    width: 80px; height: 80px;
                    background: linear-gradient(135deg, #4776E6 0%, #8E54E9 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 32px;
                    font-weight: bold;
                    box-shadow: 0 4px 15px rgba(71, 118, 230, 0.3);
                }
                .avatar-circle img {
                    width: 100%; height: 100%;
                    border-radius: 50%;
                    object-fit: cover;
                }
                .header-info h3 {
                    margin: 0 0 5px 0;
                    font-size: 22px;
                    color: #2c3e50;
                }
                .email-text {
                    margin: 0 0 8px 0;
                    color: #7f8c8d;
                    font-size: 14px;
                }
                .status-pill {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                }
                .status-pill.active { background: #e8f5e9; color: #2e7d32; }
                .status-pill.inactive { background: #ffebee; color: #c62828; }

                .modal-section {
                    padding: 20px 25px;
                }
                .modal-section h4 {
                    margin: 0 0 15px 0;
                    font-size: 16px;
                    color: #34495e;
                    border-left: 3px solid #3498db;
                    padding-left: 10px;
                }
                
                .details-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                }
                .detail-item label {
                    display: block;
                    font-size: 12px;
                    color: #95a5a6;
                    margin-bottom: 3px;
                }
                .detail-item p {
                    margin: 0;
                    font-weight: 500;
                    font-size: 14px;
                    color: #2c3e50;
                }

                .roles-list-container {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .role-chip-card {
                    background: #fff;
                    border: 1px solid #eee;
                    border-radius: 10px;
                    padding: 12px;
                    transition: all 0.2s;
                }
                .role-chip-card:hover {
                    border-color: #b3e5fc;
                    background: #f0f9ff;
                }
                .role-chip-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 5px;
                }
                .role-title {
                    font-weight: bold;
                    color: #0277bd;
                }
                .scope-badge {
                    font-size: 10px;
                    text-transform: uppercase;
                    padding: 2px 6px;
                    border-radius: 4px;
                    background: #eee;
                    color: #555;
                }
                .scope-badge.system { background: #E3F2FD; color: #1565C0; }
                .scope-badge.store { background: #FFF3E0; color: #EF6C00; }
                
                .store-info-row {
                    font-size: 13px;
                    color: #555;
                    margin-bottom: 5px;
                }
                .perm-preview {
                    font-size: 11px;
                    color: #999;
                    font-style: italic;
                }
                
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default AdminProfileModal;
