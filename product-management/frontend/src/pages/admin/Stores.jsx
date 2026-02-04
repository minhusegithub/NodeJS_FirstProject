import { useEffect, useState, useMemo } from 'react';
import axios from '../../services/axios';
import { toast } from 'react-toastify';
import { useAuthStore } from '../../stores/authStore';

const Stores = () => {
    const { user } = useAuthStore();
    const [stores, setStores] = useState([]);
    const [editingStore, setEditingStore] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        address_street: '',
        address_district: '',
        address_city: '',
        contact_phone: '',
        contact_email: '',
        manager_email: ''
    });

    // Check user roles and permissions
    const userPermissions = useMemo(() => {
        if (!user?.roles) return { isSystemAdmin: false, isStoreManager: false, managedStoreIds: [] };

        const isSystemAdmin = user.roles.some(r => r.roleName === 'SystemAdmin');
        const isStoreManager = user.roles.some(r => r.roleName === 'storeManager');
        const managedStoreIds = user.roles
            .filter(r => r.roleName === 'storeManager')
            .map(r => r.storeId);

        return { isSystemAdmin, isStoreManager, managedStoreIds };
    }, [user]);

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        try {
            const res = await axios.get('/stores');
            if (res.data.code === 200) {
                let storeList = res.data.data;

                // Filter stores for storeManager (only show their stores)
                if (userPermissions.isStoreManager && !userPermissions.isSystemAdmin) {
                    storeList = storeList.filter(s => userPermissions.managedStoreIds.includes(s.id));
                }

                setStores(storeList);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load stores");
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                code: formData.code,
                name: formData.name,
                address: {
                    street: formData.address_street,
                    district: formData.address_district,
                    city: formData.address_city
                },
                contact: {
                    phone: formData.contact_phone,
                    email: formData.contact_email
                },
                manager_email: formData.manager_email || null
            };
            const res = await axios.post('/stores', payload);
            if (res.status === 201) {
                toast.success("Tạo cửa hàng thành công!");
                resetForm();
                fetchStores();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi khi tạo cửa hàng");
        }
    };

    const handleDelete = async (storeId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa cửa hàng này?')) return;

        try {
            await axios.delete(`/stores/${storeId}`);
            toast.success("Xóa cửa hàng thành công!");
            fetchStores();
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi khi xóa cửa hàng");
        }
    };

    const handleEdit = (store) => {
        setEditingStore(store.id);
        setFormData({
            code: store.code,
            name: store.name,
            address_street: store.address?.street || '',
            address_district: store.address?.district || '',
            address_city: store.address?.city || '',
            contact_phone: store.contact?.phone || '',
            contact_email: store.contact?.email || '',
            manager_email: store.manager?.email || ''
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                code: formData.code,
                name: formData.name,
                address: {
                    street: formData.address_street,
                    district: formData.address_district,
                    city: formData.address_city
                },
                contact: {
                    phone: formData.contact_phone,
                    email: formData.contact_email
                },
                manager_email: formData.manager_email || null
            };
            const res = await axios.put(`/stores/${editingStore}`, payload);
            if (res.status === 200) {
                toast.success("Cập nhật cửa hàng thành công!");
                resetForm();
                fetchStores();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi khi cập nhật cửa hàng");
        }
    };

    const resetForm = () => {
        setEditingStore(null);
        setFormData({
            code: '',
            name: '',
            address_street: '',
            address_district: '',
            address_city: '',
            contact_phone: '',
            contact_email: '',
            manager_email: ''
        });
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>{userPermissions.isSystemAdmin ? 'Quản lý Chuỗi Cửa Hàng' : 'Quản lý Cửa Hàng'}</h1>

            {/* Create Form - Only for SystemAdmin */}
            {userPermissions.isSystemAdmin && !editingStore && (
                <div style={{ marginBottom: '30px', border: '1px solid #ddd', padding: '20px', borderRadius: '8px', background: '#f8f9fa' }}>
                    <h3 style={{ marginTop: 0 }}>➕ Thêm Cửa Hàng Mới</h3>
                    <form onSubmit={handleCreate}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Mã cửa hàng *</label>
                                <input
                                    type="text"
                                    placeholder="VD: HN01"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tên cửa hàng *</label>
                                <input
                                    type="text"
                                    placeholder="VD: Cửa hàng Hà Nội"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Địa chỉ</label>
                                <input
                                    type="text"
                                    placeholder="Số nhà, tên đường"
                                    value={formData.address_street}
                                    onChange={e => setFormData({ ...formData, address_street: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Quận/Huyện</label>
                                <input
                                    type="text"
                                    placeholder="VD: Hoàn Kiếm"
                                    value={formData.address_district}
                                    onChange={e => setFormData({ ...formData, address_district: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Thành phố</label>
                                <input
                                    type="text"
                                    placeholder="VD: Hà Nội"
                                    value={formData.address_city}
                                    onChange={e => setFormData({ ...formData, address_city: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Số điện thoại</label>
                                <input
                                    type="tel"
                                    placeholder="VD: 024 1234 5678"
                                    value={formData.contact_phone}
                                    onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email liên hệ</label>
                                <input
                                    type="email"
                                    placeholder="VD: store@example.com"
                                    value={formData.contact_email}
                                    onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email quản lý</label>
                                <input
                                    type="email"
                                    placeholder="Email của người quản lý"
                                    value={formData.manager_email}
                                    onChange={e => setFormData({ ...formData, manager_email: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                        </div>

                        <button type="submit" style={{ padding: '10px 20px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                            ➕ Tạo Cửa Hàng
                        </button>
                    </form>
                </div>
            )}

            {/* Edit Form */}
            {editingStore && (
                <div style={{ marginBottom: '30px', border: '2px solid #007bff', padding: '20px', borderRadius: '8px', background: '#e7f3ff' }}>
                    <h3 style={{ marginTop: 0 }}>✏️ Chỉnh Sửa Cửa Hàng</h3>
                    <form onSubmit={handleUpdate}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Mã cửa hàng *</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tên cửa hàng *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Địa chỉ</label>
                                <input
                                    type="text"
                                    value={formData.address_street}
                                    onChange={e => setFormData({ ...formData, address_street: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Quận/Huyện</label>
                                <input
                                    type="text"
                                    value={formData.address_district}
                                    onChange={e => setFormData({ ...formData, address_district: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Thành phố</label>
                                <input
                                    type="text"
                                    value={formData.address_city}
                                    onChange={e => setFormData({ ...formData, address_city: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Số điện thoại</label>
                                <input
                                    type="tel"
                                    value={formData.contact_phone}
                                    onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email liên hệ</label>
                                <input
                                    type="email"
                                    value={formData.contact_email}
                                    onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email quản lý</label>
                                <input
                                    type="email"
                                    value={formData.manager_email}
                                    onChange={e => setFormData({ ...formData, manager_email: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="submit" style={{ padding: '10px 20px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                💾 Lưu
                            </button>
                            <button type="button" onClick={resetForm} style={{ padding: '10px 20px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                ❌ Hủy
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #eee' }}>
                <thead>
                    <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>ID</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Mã</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Tên</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Địa chỉ</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Liên hệ</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Quản lý</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Trạng thái</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    {stores.map(store => (
                        <tr key={store.id}>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{store.id}</td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}><strong>{store.code}</strong></td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{store.name}</td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '13px' }}>
                                {[store.address?.street, store.address?.district, store.address?.city].filter(Boolean).join(', ') || '-'}
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '13px' }}>
                                {store.contact?.phone && <div>📞 {store.contact.phone}</div>}
                                {store.contact?.email && <div>✉️ {store.contact.email}</div>}
                                {!store.contact?.phone && !store.contact?.email && '-'}
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '13px' }}>
                                {store.manager ? (
                                    <div>
                                        <div><strong>{store.manager.full_name}</strong></div>
                                        <div style={{ color: '#666' }}>{store.manager.email}</div>
                                    </div>
                                ) : '-'}
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                                {store.is_active ?
                                    <span style={{ color: 'green', fontWeight: 'bold' }}>Hoạt động</span> :
                                    <span style={{ color: 'red' }}>Ngừng</span>
                                }
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                                {/* storeManager can edit their store */}
                                {(userPermissions.isStoreManager || userPermissions.isSystemAdmin) && (
                                    <button
                                        onClick={() => handleEdit(store)}
                                        style={{ padding: '5px 10px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}
                                    >
                                        ✏️ Sửa
                                    </button>
                                )}

                                {/* Only SystemAdmin can delete */}
                                {userPermissions.isSystemAdmin && (
                                    <button
                                        onClick={() => handleDelete(store.id)}
                                        style={{ padding: '5px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        🗑️ Xóa
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {stores.length === 0 && (
                        <tr>
                            <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                                Không có cửa hàng nào
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Stores;
