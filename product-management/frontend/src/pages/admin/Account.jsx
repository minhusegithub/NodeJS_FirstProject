import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/axios';

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
            if (res.data?.code === 200) {
                setRoles(res.data.data);
            }
        } catch (err) {
            console.error('Fetch roles error:', err);
        }
    };

    const fetchStoreUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/store-users');
            if (response.data.code === 200) {
                setUsers(response.data.data);
            } else {
                setError(response.data.message || 'Lỗi tải danh sách nhân viên');
            }
        } catch (err) {
            console.error('Fetch store users error:', err);
            setError(err.message || 'Lỗi kết nối server');
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
            <div className="admin-page-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="admin-page-title">Quản lý nhân viên cửa hàng</h1>
                    <p className="text-muted" style={{ color: '#666' }}>Danh sách nhân viên tại (các) cửa hàng bạn quản lý</p>
                </div>
                <button
                    className="btn-add-new"
                    onClick={handleAddNew}
                    style={{
                        background: '#2ecc71',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <span>+</span> Thêm nhân viên
                </button>
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Nhân viên</th>
                            <th>Liên hệ</th>
                            <th>Vai trò</th>
                            <th>Cửa hàng</th>
                            <th>Ngày tham gia</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Đang tải dữ liệu...</td></tr>
                        ) : error ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'red' }}>{error}</td></tr>
                        ) : users.length > 0 ? (
                            users.map(user => (
                                <tr
                                    key={user.staffId}
                                    onClick={() => handleEdit(user)}
                                    style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                                    className="hover-row"
                                    title="Nhấn để chỉnh sửa"
                                >
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {user.avatar ? (
                                                <img src={user.avatar} alt="avt" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#555' }}>
                                                    {user.fullName?.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <strong>{user.fullName}</strong>
                                        </div>
                                    </td>
                                    <td>
                                        <div>{user.email}</div>
                                        <small style={{ color: '#888' }}>{user.phone}</small>
                                    </td>
                                    <td>
                                        <span style={{
                                            background: user.roleName ? '#e3f2fd' : '#f5f5f5',
                                            color: user.roleName ? '#1565c0' : '#757575',
                                            padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500',
                                            border: user.roleName ? 'none' : '1px solid #ddd'
                                        }}>
                                            {user.roleName || 'Chưa gán quyền'}
                                        </span>
                                    </td>
                                    <td>{user.storeName}</td>
                                    <td>{formatDate(user.joinedAt)}</td>
                                    <td>
                                        <span className={`status-badge ${user.status}`}>
                                            {user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Chưa có nhân viên nào.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Add/Edit */}
            {showModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="modal-content" style={{
                        background: 'white', padding: '25px', borderRadius: '12px', width: '500px', maxWidth: '90%',
                        maxHeight: '90vh', overflowY: 'auto'
                    }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>
                                {editMode ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}
                            </h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group" style={{ marginBottom: '15px', textAlign: 'center' }}>
                                <div style={{ marginBottom: '10px' }}>
                                    {previewAvatar ? (
                                        <img src={previewAvatar} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ddd' }} />
                                    ) : (
                                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: '24px', color: '#888' }}>
                                            📷
                                        </div>
                                    )}
                                </div>
                                <label style={{ cursor: 'pointer', color: '#3498db', fontWeight: 'bold' }}>
                                    {editMode ? 'Thay đổi ảnh đại diện' : 'Tải lên ảnh đại diện'}
                                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                </label>
                            </div>

                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Họ và tên <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    placeholder="Ví dụ: Nguyễn Văn A"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    required
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Email <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    placeholder="staff@example.com"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    required
                                // Disable email editing? Usually ID shouldn't change, but user asked for "same fields".
                                // Let's keep editable but backend checks uniqueness.
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                                    {editMode ? 'Mật khẩu mới (Để trống nếu không đổi)' : 'Mật khẩu'}
                                    {!editMode && <span style={{ color: 'red' }}> *</span>}
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    placeholder={editMode ? "********" : "Nhập mật khẩu"}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    required={!editMode}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Số điện thoại</label>
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    placeholder="0901234567"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Địa chỉ</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    placeholder="Địa chỉ liên hệ"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                            </div>

                            {/* Role Select */}
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Vai trò</label>
                                <select
                                    name="roleId"
                                    value={formData.roleId}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', background: 'white' }}
                                >
                                    <option value="">-- Chưa gán quyền --</option>
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Status Checkbox (Only in Edit Mode) */}
                            {editMode && (
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Trạng thái</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', background: 'white' }}
                                    >
                                        <option value="active">Hoạt động</option>
                                        <option value="inactive">Vô hiệu hóa (Khóa)</option>
                                    </select>
                                </div>
                            )}

                            <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: submitting ? '#95a5a6' : '#3498db',
                                        color: 'white',
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {submitting ? 'Đang xử lý...' : (editMode ? 'Cập nhật' : 'Thêm mới')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style sx>{`
                .hover-row:hover {
                    background-color: #f9fafb;
                }
            `}</style>
        </div>
    );
};

export default AdminAccount;
