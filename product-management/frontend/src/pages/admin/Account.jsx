import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/axios';

const AdminAccount = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal & Form State
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        fetchStoreUsers();
    }, []);

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.fullName || !formData.email || !formData.password) {
            toast.warning('Vui lòng nhập các trường bắt buộc!');
            return;
        }

        try {
            setSubmitting(true);
            const res = await api.post('/admin/store-users', formData);
            if (res.data?.code === 200) {
                toast.success('Thêm nhân viên thành công!');
                setShowModal(false);
                setFormData({ fullName: '', email: '', password: '', phone: '', address: '' });
                fetchStoreUsers(); // Refresh list
            } else {
                toast.error(res.data?.message || 'Thêm thất bại');
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
                    onClick={() => setShowModal(true)}
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
                                <tr key={user.staffId}>
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

            {/* Modal Add New */}
            {showModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="modal-content" style={{
                        background: 'white', padding: '25px', borderRadius: '12px', width: '500px', maxWidth: '90%'
                    }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Thêm nhân viên mới</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
                        </div>

                        <form onSubmit={handleSubmit}>
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
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Email đăng nhập <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    placeholder="staff@example.com"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    required
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Mật khẩu <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    placeholder="Nhập mật khẩu"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    required
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

                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '25px' }}>
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

                            <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
                                    {submitting ? 'Đang xử lý...' : 'Thêm mới'}
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
