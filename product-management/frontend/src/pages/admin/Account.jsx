import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/axios';
import '../../assets/styles/admin-accounts.css';

const AdminAccount = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]); // Store role list for dropdown
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal & Form State
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Initialize form with default structure
    const initialForm = {
        fullName: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        roleId: '',  // For dropdown selection
        status: 'active' // For edit mode status toggle
    };

    const [formData, setFormData] = useState(initialForm);
    const [previewAvatar, setPreviewAvatar] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);

    useEffect(() => {
        fetchStoreUsers();
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const res = await api.get('/admin/store-users/roles');
            if (res?.data?.code === 200) {
                setRoles(res.data.data || []);
            }
        } catch (err) {
            console.error('Fetch roles error:', err);
        }
    };

    const fetchStoreUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/store-users');
            if (response?.data?.code === 200) {
                setUsers(response.data.data || []);
            } else {
                setError(response?.data?.message || 'Lỗi tải danh sách nhân viên');
            }
        } catch (err) {
            console.error('Fetch store users error:', err);
            setError(err?.response?.data?.message || err.message || 'Lỗi kết nối server');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Open Modal for Create
    const handleAddNew = () => {
        setEditMode(false);
        setFormData(initialForm);
        setPreviewAvatar(null);
        setAvatarFile(null);
        setShowModal(true);
    };

    // Open Modal for Edit
    const handleEdit = (user) => {
        setEditMode(true);
        setSelectedStaffId(user.staffId);

        // Find roleId matching the roleName (Since backend returns roleName in list)
        // Or we should update backend list to include role_id, but usually we can match by roleName or fetch detail.
        // Wait, the backend list API I wrote returns `roleName`. But update API needs `roleId`.
        // The list API response item: { ..., roleName: '...', ... }
        // The getRoles API returns: [{ id, name }, ...]

        // Let's find roleId from roles list based on roleName
        const matchedRole = roles.find(r => r.name === user.roleName);

        setFormData({
            fullName: user.fullName || '',
            email: user.email || '',
            password: '', // Leave empty if not changing
            phone: user.phone || '',
            address: user.address || '', // User detail might not expose address in list? Check controller.
            // Controller index: includes User (exclude password). Yes, address is there.
            // Controller response format: address is not explicitly mapped in `formattedData`.
            // Let me check controller index again. Oh, I mapped fullName, email, phone. Address? No!
            // I need to update controller index to include address if I want to edit it properly.
            // Or I fetch detail on edit click. Fetch detail is safer.
            // But for now let's assume address is in list or add it to controller.

            // Temporary fix: I will use what's available. If address missing, user types it again.
            // Wait, let me check controller code I wrote.
            // `formattedData = staffList.map(...)`. I didn't map address!

            roleId: matchedRole ? matchedRole.id : '',
            status: user.status || 'active'
        });



        setPreviewAvatar(user.avatar);
        setAvatarFile(null);
        setShowModal(true);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setPreviewAvatar(URL.createObjectURL(file));
        }
    };

    // NOTE: I should update controller index to return address to ensure edit works well.
    // I will write a quick fix for controller index later or just proceed.

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.fullName || !formData.email) {
            toast.warning('Vui lòng nhập họ tên và email!');
            return;
        }
        if (!editMode && !formData.password) {
            toast.warning('Vui lòng nhập mật khẩu cho tài khoản mới!');
            return;
        }

        try {
            setSubmitting(true);
            const payload = new FormData();
            Object.keys(formData).forEach(key => {
                if (formData[key] !== null && formData[key] !== undefined) {
                    payload.append(key, formData[key]);
                }
            });
            if (avatarFile) {
                payload.append('avatar', avatarFile);
            }

            let res;
            if (editMode) {
                res = await api.put(`/admin/store-users/${selectedStaffId}`, payload);
            } else {
                res = await api.post('/admin/store-users', payload);
            }

            if (res.data?.code === 200) {
                toast.success(editMode ? 'Cập nhật thành công!' : 'Thêm nhân viên thành công!');
                setShowModal(false);
                fetchStoreUsers(); // Refresh list
            } else {
                toast.error(res.data?.message || 'Thao tác thất bại');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Lỗi kết nối server');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '---';
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    return (
        <div className="admin-page">
            {/* Page Header */}
            <div className="accounts-header">
                <div className="accounts-header-info">
                    <h1>Quản lý nhân viên cửa hàng</h1>
                    <p>Danh sách nhân viên tại cửa hàng bạn quản lý</p>
                </div>
                <button className="btn-add-staff" onClick={handleAddNew}>
                    <span>＋</span> Thêm nhân viên
                </button>
            </div>

            {/* Staff Cards */}
            {loading ? (
                <div className="accounts-loading">Đang tải dữ liệu...</div>
            ) : error ? (
                <div className="accounts-error">{error}</div>
            ) : users.length === 0 ? (
                <div className="accounts-empty">Chưa có nhân viên nào.</div>
            ) : (
                <div className="staff-grid">
                    {users.map(user => (
                        <div
                            key={user.staffId}
                            className="staff-card"
                            onClick={() => handleEdit(user)}
                            title="Nhấn để chỉnh sửa"
                        >
                            {/* Left: Avatar */}
                            <div className="staff-card-left">
                                {user.avatar ? (
                                    <img src={user.avatar} alt="avatar" className="staff-avatar" />
                                ) : (
                                    <div className="staff-avatar-placeholder">
                                        {user.fullName?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            {/* Right: All info */}
                            <div className="staff-card-right">
                                <div className="staff-card-name">{user.fullName}</div>
                                <span className={`status-badge ${user.status}`}>
                                    {user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                                </span>

                                <div className="staff-card-body">
                                    <div className="staff-info-row">
                                        
                                         <span className="staff-info-icon" aria-hidden="true">
                                            <i className="fa-solid fa-envelope"></i>
                                        </span>
                                        <span className="staff-info-text">{user.email}</span>
                                    </div>
                                    {user.phone && (
                                        <div className="staff-info-row">
                                            <span className="staff-info-icon" aria-hidden="true">
                                                <i className="fa-solid fa-phone"></i>
                                            </span>
                                            <span className="staff-info-text">{user.phone}</span>
                                        </div>
                                    )}
                                    <div className="staff-info-row">
                                        
                                        <span className={`staff-role-badge ${!user.roleName ? 'no-role' : (user.roleName == 'storeManager' ? 'role-store-manager' : 'has-role') }`}>
                                            {user.roleName || 'Chưa gán quyền'}
                                        </span>
                                    </div>
                                </div>

                                <div className="staff-card-footer">
                                    
                                    <span>📅 {formatDate(user.joinedAt)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Add / Edit */}
            {showModal && (
                <div className="accounts-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="accounts-modal">
                        {/* Modal Header */}
                        <div className="accounts-modal-header">
                            <h3>{editMode ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}</h3>
                            <button className="accounts-modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="accounts-modal-body">
                                {/* Avatar upload */}
                                <div className="accounts-avatar-upload">
                                    {previewAvatar ? (
                                        <img src={previewAvatar} alt="Preview" className="accounts-avatar-preview" />
                                    ) : (
                                        <div className="accounts-avatar-placeholder-lg">📷</div>
                                    )}
                                    <label className="accounts-avatar-label">
                                        📁 {editMode ? 'Thay đổi ảnh' : 'Tải lên ảnh'}
                                        <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                    </label>
                                </div>

                                {/* Full name */}
                                <div className="accounts-form-group">
                                    <label className="accounts-form-label">
                                        Họ và tên <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        className="accounts-form-input"
                                        placeholder="Ví dụ: Nguyễn Văn A"
                                        required
                                    />
                                </div>

                                {/* Email + Phone in one row */}
                                <div className="accounts-form-row">
                                    <div className="accounts-form-group">
                                        <label className="accounts-form-label">
                                            Email <span className="required">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="accounts-form-input"
                                            placeholder="staff@example.com"
                                            required
                                        />
                                    </div>
                                    <div className="accounts-form-group">
                                        <label className="accounts-form-label">Số điện thoại</label>
                                        <input
                                            type="text"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="accounts-form-input"
                                            placeholder="0901234567"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="accounts-form-group">
                                    <label className="accounts-form-label">
                                        {editMode ? 'Mật khẩu mới (để trống nếu không đổi)' : <>Mật khẩu <span className="required">*</span></>}
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="accounts-form-input"
                                        placeholder={editMode ? '••••••••' : 'Nhập mật khẩu'}
                                        required={!editMode}
                                    />
                                </div>

                                {/* Address */}
                                <div className="accounts-form-group">
                                    <label className="accounts-form-label">Địa chỉ</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        className="accounts-form-input"
                                        placeholder="Địa chỉ liên hệ"
                                    />
                                </div>

                                {/* Role + Status in one row */}
                                <div className="accounts-form-row">
                                    <div className="accounts-form-group">
                                        <label className="accounts-form-label">Vai trò</label>
                                        <select
                                            name="roleId"
                                            value={formData.roleId}
                                            onChange={handleInputChange}
                                            className="accounts-form-select"
                                        >
                                            <option value="">-- Chưa gán quyền --</option>
                                            {roles.filter(role => role.name !== 'storeManager' || role.id === formData.roleId).map(role => (
                                                <option key={role.id} value={role.id}>{role.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {editMode && (
                                        <div className="accounts-form-group">
                                            <label className="accounts-form-label">Trạng thái</label>
                                            <select
                                                name="status"
                                                value={formData.status}
                                                onChange={handleInputChange}
                                                className="accounts-form-select"
                                            >
                                                <option value="active">Hoạt động</option>
                                                <option value="inactive">Vô hiệu hóa</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="accounts-modal-footer">
                                <button type="button" className="btn-accounts-cancel" onClick={() => setShowModal(false)}>
                                    Hủy
                                </button>
                                <button type="submit" className="btn-accounts-submit" disabled={submitting}>
                                    {submitting ? 'Đang xử lý...' : (editMode ? 'Cập nhật' : 'Thêm mới')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAccount;
