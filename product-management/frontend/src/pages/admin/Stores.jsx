import { useEffect, useState, useMemo } from 'react';
import api from '../../services/axios';
import { toast } from 'react-toastify';
import { useAuthStore } from '../../stores/authStore';

const Stores = () => {
    const { user, logout } = useAuthStore();
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
            const res = await api.get('/stores');
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
            const res = await api.post('/stores', payload);
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
            await api.delete(`/stores/${storeId}`);
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
            const res = await api.put(`/stores/${editingStore}`, payload);
            if (res.status === 200) {
                // If current user lost manager role, force logout
                if (res.data?.roleChanged) {
                    console.log("---------------112004");
                    toast.warning("Quyền quản lý của bạn đã bị thu hồi. Bạn sẽ bị đăng xuất...");
                    setTimeout(async () => {
                        await logout();
                        window.location.href = '/login';
                    }, 2000);
                    return;
                }

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

    const formatAddress = (store) => {
        return [store.address?.street, store.address?.district, store.address?.city]
            .filter(Boolean)
            .join(', ') || '-';
    };

    return (
        <div className="store-page">
            <div className="store-page-header">
                <div>
                    <h1 className="store-page-title">
                        {userPermissions.isSystemAdmin ? 'Quản lý Chuỗi Cửa Hàng' : 'Quản lý Cửa Hàng'}
                    </h1>
                    
                </div>
            </div>

            {userPermissions.isSystemAdmin && !editingStore && (
                <section className="store-panel">
                    <div className="store-panel-header">
                        <h3>Thêm cửa hàng mới</h3>
                    </div>
                    <form className="store-form" onSubmit={handleCreate}>
                        <div className="store-form-grid store-form-grid-2">
                            <div className="store-field">
                                <label className="store-label">Mã cửa hàng *</label>
                                <input
                                    type="text"
                                    placeholder="VD: HN01"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    required
                                    className="store-input"
                                />
                            </div>
                            <div className="store-field">
                                <label className="store-label">Tên cửa hàng *</label>
                                <input
                                    type="text"
                                    placeholder="VD: Cửa hàng Hà Nội"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="store-input"
                                />
                            </div>
                        </div>

                        <div className="store-form-grid store-form-grid-3">
                            <div className="store-field">
                                <label className="store-label">Số nhà + tên đường</label>
                                <input
                                    type="text"
                                    placeholder="Số nhà và tên đường"
                                    value={formData.address_street}
                                    onChange={e => setFormData({ ...formData, address_street: e.target.value })}
                                    className="store-input"
                                />
                            </div>
                            <div className="store-field">
                                <label className="store-label">Quận/Huyện</label>
                                <input
                                    type="text"
                                    placeholder="VD: Hoàn Kiếm"
                                    value={formData.address_district}
                                    onChange={e => setFormData({ ...formData, address_district: e.target.value })}
                                    className="store-input"
                                />
                            </div>
                            <div className="store-field">
                                <label className="store-label">Thành phố</label>
                                <input
                                    type="text"
                                    placeholder="VD: Hà Nội"
                                    value={formData.address_city}
                                    onChange={e => setFormData({ ...formData, address_city: e.target.value })}
                                    className="store-input"
                                />
                            </div>
                        </div>

                        <div className="store-form-grid store-form-grid-3">
                            <div className="store-field">
                                <label className="store-label">Số điện thoại</label>
                                <input
                                    type="tel"
                                    placeholder="VD: 024 1234 5678"
                                    value={formData.contact_phone}
                                    onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                                    className="store-input"
                                />
                            </div>
                            <div className="store-field">
                                <label className="store-label">Email liên hệ</label>
                                <input
                                    type="email"
                                    placeholder="VD: store@example.com"
                                    value={formData.contact_email}
                                    onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                                    className="store-input"
                                />
                            </div>
                            <div className="store-field">
                                <label className="store-label">Email quản lý</label>
                                <input
                                    type="email"
                                    placeholder="Email của người quản lý"
                                    value={formData.manager_email}
                                    onChange={e => setFormData({ ...formData, manager_email: e.target.value })}
                                    className="store-input"
                                />
                            </div>
                        </div>

                        <div className="store-form-actions">
                            <button type="submit" className="store-btn store-btn-primary">
                                <i className="fa-solid fa-pen"></i>
                                Cập nhật cửa hàng
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {editingStore && (
                <div className="modal-overlay" onClick={resetForm}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Chỉnh sửa cửa hàng</div>
                            <button type="button" className="btn-close" onClick={resetForm}>
                                ×
                            </button>
                        </div>
                        <form className="modal-form store-form" onSubmit={handleUpdate}>
                            <div className="store-form-grid store-form-grid-2">
                                <div className="store-field">
                                    <label className="store-label">Mã cửa hàng</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        required
                                        className="store-input"
                                    />
                                </div>
                                <div className="store-field">
                                    <label className="store-label">Tên cửa hàng</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        className="store-input"
                                    />
                                </div>
                            </div>

                            <div className="store-form-grid store-form-grid-3">
                                <div className="store-field">
                                    <label className="store-label">Số nhà + tên đường</label>
                                    <input
                                        type="text"
                                        placeholder= "Số nhà và tên đường"
                                        value={formData.address_street}
                                        onChange={e => setFormData({ ...formData, address_street: e.target.value })}
                                        className="store-input"
                                    />
                                </div>
                                <div className="store-field">
                                    <label className="store-label">Quận/Huyện</label>
                                    <input
                                        type="text"
                                        value={formData.address_district}
                                        onChange={e => setFormData({ ...formData, address_district: e.target.value })}
                                        className="store-input"
                                    />
                                </div>
                                <div className="store-field">
                                    <label className="store-label">Thành phố</label>
                                    <input
                                        type="text"
                                        value={formData.address_city}
                                        onChange={e => setFormData({ ...formData, address_city: e.target.value })}
                                        className="store-input"
                                    />
                                </div>
                            </div>

                            <div className="store-form-grid store-form-grid-3">
                                <div className="store-field">
                                    <label className="store-label">Số điện thoại</label>
                                    <input
                                        type="tel"
                                        value={formData.contact_phone}
                                        onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                                        className="store-input"
                                    />
                                </div>
                                <div className="store-field">
                                    <label className="store-label">Email liên hệ</label>
                                    <input
                                        type="email"
                                        value={formData.contact_email}
                                        onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                                        className="store-input"
                                    />
                                </div>
                                <div className="store-field">
                                    <label className="store-label">Email quản lý</label>
                                    <input
                                        type="email"
                                        value={formData.manager_email}
                                        onChange={e => setFormData({ ...formData, manager_email: e.target.value })}
                                        className="store-input"
                                    />
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="submit" className="store-btn store-btn-primary">
                                    <i className="fa-solid fa-floppy-disk"></i>
                                    Cập nhật
                                </button>
                                
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <section className="store-list">
                {stores.length === 0 && (
                    <div className="store-empty">
                        Không có cửa hàng nào
                    </div>
                )}

                <div className={stores.length === 1 ? "store-single" : "store-grid"}>
                    {stores.map(store => (
                        <article className="store-card" key={store.id}  onClick={() => handleEdit(store)}>
                            <div className="store-card-header">
                                <div>
                                    <h4 className="store-card-title">{store.name}</h4>
                                    <span className="store-card-code">#{store.code}</span>
                                </div>
                                <span className={`store-status ${store.is_active ? 'is-active' : 'is-inactive'}`}>
                                    {store.is_active ? 'Hoạt động' : 'Ngừng'}
                                </span>
                            </div>

                            <div className="store-card-body">
                                <div className="store-meta">
                                    <div className="store-meta-item">
                                        <span className="store-meta-icon" aria-hidden="true">
                                            <i className="fa-solid fa-location-dot"></i>
                                        </span>
                                        <div className="store-meta-text">{formatAddress(store)}</div>
                                    </div>
                                    <div className="store-meta-item">
                                        <span className="store-meta-icon" aria-hidden="true">
                                            <i className="fa-solid fa-phone"></i>
                                        </span>
                                        <div className="store-meta-text">
                                            {store.contact?.phone || '-'}
                                        </div>
                                    </div>
                                    <div className="store-meta-item">
                                        <span className="store-meta-icon" aria-hidden="true">
                                            <i className="fa-regular fa-envelope"></i>
                                        </span>
                                        <div className="store-meta-text">
                                            {store.contact?.email || '-'}
                                        </div>
                                    </div>
                                    <div className="store-meta-item">
                                        <span className="store-meta-icon" aria-hidden="true">
                                            <i className="fa-solid fa-user-tie"></i>
                                        </span>
                                        <div className="store-meta-text">
                                            {store.manager ? (
                                                <div>
                                                    <div className="store-manager-name">{store.manager.full_name}</div>
                                                    <div className="store-manager-email">{store.manager.email}</div>
                                                </div>
                                            ) : '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="store-card-actions">
                                            

                                {userPermissions.isSystemAdmin && (
                                    <button
                                        onClick={() => handleDelete(store.id)}
                                        className="store-btn store-btn-danger"
                                    >
                                        <i className="fa-solid fa-trash"></i>
                                        Xóa
                                    </button>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Stores;
