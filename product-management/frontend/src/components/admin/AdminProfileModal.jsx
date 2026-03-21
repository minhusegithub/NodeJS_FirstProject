import { useState, useEffect, useRef } from 'react';
import api from '../../services/axios';
import '../../assets/styles/admin.css';

const AdminProfileModal = ({ isOpen, onClose }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Edit mode state
    const [activeTab, setActiveTab] = useState('view'); // 'view' | 'edit'
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Edit form state
    const [form, setForm] = useState({ fullName: '', email: '', phone: '', address: '', password: '', confirmPassword: '' });
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setActiveTab('view');
            setSaveError(null);
            setSaveSuccess(false);
            setAvatarFile(null);
            setAvatarPreview(null);
            fetchProfile();
        }
    }, [isOpen]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/user/profile');
            if (response.data?.code === 200 && response.data?.data) {
                const data = response.data.data;
                setProfile(data);
                setForm({
                    fullName: data.fullName || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    password: '',
                    confirmPassword: ''
                });
            } else {
                setError(response.data?.message || 'Lỗi server: Định dạng response sai');
            }
        } catch (err) {
            setError(`Lỗi: ${err.response?.data?.message || err.message || 'Không thể tải thông tin.'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setSaveError('Vui lòng chọn file ảnh hợp lệ.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setSaveError('Kích thước ảnh không được vượt quá 5MB.');
            return;
        }
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
        setSaveError(null);
    };

    const handleSave = async () => {
        setSaveError(null);
        setSaveSuccess(false);

        if (!form.fullName.trim()) {
            setSaveError('Họ và tên không được để trống.');
            return;
        }
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            setSaveError('Email không hợp lệ.');
            return;
        }
        if (form.password && form.password.length < 6) {
            setSaveError('Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }
        if (form.password && form.password !== form.confirmPassword) {
            setSaveError('Mật khẩu xác nhận không khớp.');
            return;
        }

        try {
            setSaving(true);
            const formData = new FormData();
            formData.append('fullName', form.fullName.trim());
            formData.append('email', form.email.trim());
            formData.append('phone', form.phone.trim());
            formData.append('address', form.address.trim());
            if (form.password) formData.append('password', form.password);
            if (avatarFile) formData.append('avatar', avatarFile);

            const res = await api.patch('/user/info', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data?.success) {
                const updated = res.data.data?.user;
                if (updated) {
                    setProfile(prev => ({
                        ...prev,
                        fullName: updated.fullName,
                        email: updated.email,
                        phone: updated.phone,
                        address: updated.address,
                        avatar: updated.avatar
                    }));
                }
                setAvatarFile(null);
                setAvatarPreview(null);
                setForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
                setSaveSuccess(true);
                setTimeout(() => {
                    setSaveSuccess(false);
                    setActiveTab('view');
                }, 1800);
            } else {
                setSaveError(res.data?.message || 'Cập nhật thất bại.');
            }
        } catch (err) {
            setSaveError(err.response?.data?.message || err.message || 'Lỗi máy chủ.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        if (profile) {
            setForm({ fullName: profile.fullName || '', email: profile.email || '', phone: profile.phone || '', address: profile.address || '', password: '', confirmPassword: '' });
        }
        setAvatarFile(null);
        setAvatarPreview(null);
        setSaveError(null);
        setSaveSuccess(false);
        setActiveTab('view');
    };

    const currentAvatar = avatarPreview || profile?.avatar || null;
    const avatarInitial = (profile?.fullName || '?').charAt(0).toUpperCase();

    if (!isOpen) return null;

    return (
        <div className="apm-overlay" onClick={onClose}>
            <div className="apm-content" onClick={e => e.stopPropagation()}>
                <button className="apm-close" onClick={onClose}>&#x2715;</button>

                {loading ? (
                    <div className="apm-center-state">
                        <div className="apm-spinner" />
                        <p>Đang tải hồ sơ...</p>
                    </div>
                ) : error ? (
                    <div className="apm-center-state apm-error-state">
                        <div className="apm-error-icon">⚠</div>
                        <p>{error}</p>
                        <button className="apm-btn apm-btn-secondary" onClick={fetchProfile}>Thử lại</button>
                    </div>
                ) : profile ? (
                    <>
                        {/* ── HEADER ── */}
                        <div className="apm-header">
                            <div
                                className="apm-avatar"
                                onClick={() => activeTab === 'edit' && fileInputRef.current?.click()}
                                title={activeTab === 'edit' ? 'Nhấn để đổi ảnh' : ''}
                            >
                                {currentAvatar
                                    ? <img src={currentAvatar} alt="Avatar" />
                                    : <span>{avatarInitial}</span>}
                                {activeTab === 'edit' && (
                                    <div className="apm-avatar-overlay">
                                        <span>📷</span>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleAvatarChange}
                            />
                            <div className="apm-header-info">
                                <h3>{profile.fullName}</h3>
                                <span className={`apm-status ${profile.status}`}>
                                    {profile.status === 'active' ? '● Đang hoạt động' : '● Vô hiệu hóa'}
                                </span>

                            </div>
                        </div>

                        {/* ── TABS ── */}
                        <div className="apm-tabs">
                            <button
                                className={`apm-tab ${activeTab === 'view' ? 'active' : ''}`}
                                onClick={() => activeTab === 'edit' ? handleCancelEdit() : setActiveTab('view')}
                            >
                                Hồ sơ
                            </button>
                            <button
                                className={`apm-tab ${activeTab === 'edit' ? 'active' : ''}`}
                                onClick={() => setActiveTab('edit')}
                            >
                                Chỉnh sửa
                            </button>
                        </div>

                        {/* ── VIEW MODE ── */}
                        {activeTab === 'view' && (
                            <div className="apm-body">
                                <div className="apm-section">
                                    <h4 className="apm-section-title">Thông tin liên hệ</h4>
                                    <div className="apm-details-grid">
                                        <div className="apm-detail-item">
                                            <label>Họ và tên</label>
                                            <p>{profile.fullName || '---'}</p>
                                        </div>
                                        <div className="apm-detail-item">
                                            <label>Email</label>
                                            <p>{profile.email || '---'}</p>
                                        </div>
                                        <div className="apm-detail-item">
                                            <label>Số điện thoại</label>
                                            <p>{profile.phone || '---'}</p>
                                        </div>
                                        <div className="apm-detail-item">
                                            <label>Ngày tham gia</label>
                                            <p>{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN') : '---'}</p>
                                        </div>
                                        <div className="apm-detail-item apm-detail-full">
                                            <label>Địa chỉ</label>
                                            <p>{profile.address || '---'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="apm-section">
                                    <h4 className="apm-section-title">Vai trò &amp; Quyền hạn</h4>
                                    <div className="apm-roles-list">
                                        {profile.roles?.length > 0 ? profile.roles.map((role, idx) => (
                                            <div key={idx} className="apm-role-card">
                                                <div className="apm-role-header">
                                                    <span className="apm-role-name">{role.roleName}</span>
                                                    {role.roleScope && <span className="apm-role-scope">{role.roleScope}</span>}
                                                </div>
                                                {role.storeName && <div className="apm-store-row">🏪 {role.storeName}</div>}
                                                {role.permissions?.length > 0 && (
                                                    <div className="apm-perm-preview">
                                                        {role.permissions.join(', ').substring(0, 60)}...
                                                    </div>
                                                )}
                                            </div>
                                        )) : (
                                            <p className="apm-empty">Chưa được gán vai trò nào.</p>
                                        )}
                                    </div>
                                </div>


                            </div>
                        )}

                        {/* ── EDIT MODE ── */}
                        {activeTab === 'edit' && (
                            <div className="apm-body">
                                {avatarPreview && (
                                    <div className="apm-avatar-hint">
                                        ✅ Ảnh mới đã chọn. Nhấn <strong>Lưu thay đổi</strong> để cập nhật.
                                    </div>
                                )}

                                <div className="apm-section">
                                    <h4 className="apm-section-title">Thông tin cơ bản</h4>
                                    <div className="apm-form-grid">
                                        <div className="apm-form-group apm-form-full">
                                            <label htmlFor="apm-fullName">Họ và tên <span className="apm-required">*</span></label>
                                            <input
                                                id="apm-fullName"
                                                type="text"
                                                value={form.fullName}
                                                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                                                placeholder="Nhập họ và tên..."
                                            />
                                        </div>
                                        <div className="apm-form-group">
                                            <label htmlFor="apm-email">Email</label>
                                            <input
                                                id="apm-email"
                                                type="email"
                                                value={form.email}
                                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                                placeholder="example@email.com"
                                            />
                                        </div>
                                        <div className="apm-form-group">
                                            <label htmlFor="apm-phone">Số điện thoại</label>
                                            <input
                                                id="apm-phone"
                                                type="tel"
                                                value={form.phone}
                                                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                                placeholder="0xxxxxxxxx"
                                            />
                                        </div>
                                        <div className="apm-form-group apm-form-full">
                                            <label htmlFor="apm-address">Địa chỉ</label>
                                            <input
                                                id="apm-address"
                                                type="text"
                                                value={form.address}
                                                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                                placeholder="Số nhà, đường, quận, tỉnh/thành..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="apm-section">
                                    <h4 className="apm-section-title">
                                        Đổi mật khẩu <span className="apm-optional">(tuỳ chọn)</span>
                                    </h4>
                                    <div className="apm-form-grid">
                                        <div className="apm-form-group">
                                            <label htmlFor="apm-password">Mật khẩu mới</label>
                                            <input
                                                id="apm-password"
                                                type="password"
                                                value={form.password}
                                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                                placeholder="Tối thiểu 6 ký tự..."
                                            />
                                        </div>
                                        <div className="apm-form-group">
                                            <label htmlFor="apm-confirmPassword">Xác nhận mật khẩu</label>
                                            <input
                                                id="apm-confirmPassword"
                                                type="password"
                                                value={form.confirmPassword}
                                                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                                placeholder="Nhập lại mật khẩu mới..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {saveError && (
                                    <div className="apm-feedback apm-feedback-error">
                                        ❌ {saveError}
                                    </div>
                                )}
                                {saveSuccess && (
                                    <div className="apm-feedback apm-feedback-success">
                                        ✅ Cập nhật thông tin thành công!
                                    </div>
                                )}

                                <div className="apm-footer-actions">
                                    <button className="apm-btn apm-btn-secondary" onClick={handleCancelEdit} disabled={saving}>
                                        Huỷ
                                    </button>
                                    <button className="apm-btn apm-btn-primary" onClick={handleSave} disabled={saving}>
                                        {saving ? <><span className="apm-btn-spinner" /> Đang lưu...</> : ' Lưu thay đổi'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default AdminProfileModal;
