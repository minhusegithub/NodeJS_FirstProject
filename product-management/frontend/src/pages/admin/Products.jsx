import { useEffect, useState, useMemo } from 'react';
import axios from '../../services/axios';
import { toast } from 'react-toastify';
import { useAuthStore } from '../../stores/authStore';

const Products = () => {
    const { user } = useAuthStore();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        sku: '',
        title: '',
        product_category_id: '',
        description: '',
        price: 0,
        discount_percentage: 0,
        brand: '',
        weight: '',
        thumbnail: '',
        status: 'active',
        featured: false
    });

    // Check user permissions and store
    const userPermissions = useMemo(() => {
        if (!user?.roles) return { canManageProducts: false, isSystemAdmin: false, userStoreId: null };

        const canManageProducts = user.roles.some(r =>
            ['SystemAdmin', 'storeManager', 'InventoryStaff'].includes(r.roleName)
        );
        const canDelete = user.roles.some(r => r.roleName === 'SystemAdmin');
        const isSystemAdmin = user.roles.some(r => r.roleName === 'SystemAdmin');

        // Get user's store_id (for storeManager and InventoryStaff)
        const storeRole = user.roles.find(r => ['storeManager', 'InventoryStaff'].includes(r.roleName));
        const userStoreId = storeRole?.storeId || null;

        const result = { canManageProducts, canDelete, isSystemAdmin, userStoreId };
        console.log('👤 User Permissions:', result);
        console.log('👤 User Roles:', user?.roles);
        return result;
    }, [user]);

    useEffect(() => {
        if (user) { // Only fetch when user is loaded
            fetchProducts();
            fetchCategories();
        }
    }, [user]); // Re-fetch when user changes

    const fetchProducts = async () => {
        try {
            const res = await axios.get('/products?limit=100');
            if (res.data.code === 200) {
                let filteredProducts = res.data.data;

                // Filter by store if user is not SystemAdmin
                if (!userPermissions.isSystemAdmin && userPermissions.userStoreId) {
                    filteredProducts = res.data.data.filter(product => {
                        // Only show products that exist in user's store
                        return product.inventory?.some(inv => inv.store_id === userPermissions.userStoreId);
                    });
                }

                setProducts(filteredProducts);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load products");
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await axios.get('/admin/product-category');
            if (res.data.code === 200) {
                setCategories(res.data.data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                price: parseFloat(formData.price),
                discount_percentage: parseFloat(formData.discount_percentage),
                weight: formData.weight ? parseFloat(formData.weight) : null,
                product_category_id: formData.product_category_id || null
            };

            const res = await axios.post('/products', payload);
            if (res.status === 201) {
                toast.success("Tạo sản phẩm thành công!");
                resetForm();
                fetchProducts();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi khi tạo sản phẩm");
        }
    };

    const handleDelete = async (productId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;

        try {
            await axios.delete(`/products/${productId}`);
            toast.success("Xóa sản phẩm thành công!");
            fetchProducts();
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi khi xóa sản phẩm");
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product.id);
        setFormData({
            sku: product.sku || '',
            title: product.title,
            product_category_id: product.product_category_id || '',
            description: product.description || '',
            price: product.price,
            discount_percentage: product.discount_percentage || 0,
            brand: product.brand || '',
            weight: product.weight || '',
            thumbnail: product.thumbnail || '',
            status: product.status,
            featured: product.featured || false
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                price: parseFloat(formData.price),
                discount_percentage: parseFloat(formData.discount_percentage),
                weight: formData.weight ? parseFloat(formData.weight) : null,
                product_category_id: formData.product_category_id || null
            };

            const res = await axios.put(`/products/${editingProduct}`, payload);
            if (res.status === 200) {
                toast.success("Cập nhật sản phẩm thành công!");
                resetForm();
                fetchProducts();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi khi cập nhật sản phẩm");
        }
    };

    const resetForm = () => {
        setEditingProduct(null);
        setFormData({
            sku: '',
            title: '',
            product_category_id: '',
            description: '',
            price: 0,
            discount_percentage: 0,
            brand: '',
            weight: '',
            thumbnail: '',
            status: 'active',
            featured: false
        });
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    };

    const getTotalStock = (inventory) => {
        if (!inventory || inventory.length === 0) return 0;

        // If user is not SystemAdmin, only count stock in their store
        if (!userPermissions.isSystemAdmin && userPermissions.userStoreId) {
            const storeInventory = inventory.find(inv => inv.store_id === userPermissions.userStoreId);
            const stock = storeInventory?.stock || 0;
            console.log(`[Store ${userPermissions.userStoreId}] Stock:`, stock, 'from inventory:', storeInventory);
            return stock;
        }

        // SystemAdmin sees total stock across all stores
        const total = inventory.reduce((sum, inv) => sum + inv.stock, 0);
        console.log('[SystemAdmin] Total stock:', total, 'from', inventory.length, 'stores');
        return total;
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>Quản lý Sản phẩm</h1>

            {/* Store Info Banner */}
            {!userPermissions.isSystemAdmin && userPermissions.userStoreId && (
                <div style={{ padding: '12px 20px', background: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '6px', marginBottom: '20px' }}>
                    <strong>🏢 Cửa hàng của bạn:</strong> Bạn đang xem sản phẩm của cửa hàng ID #{userPermissions.userStoreId}
                </div>
            )}
            {userPermissions.isSystemAdmin && (
                <div style={{ padding: '12px 20px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', marginBottom: '20px' }}>
                    <strong>👑 SystemAdmin:</strong> Bạn đang xem tất cả sản phẩm từ mọi cửa hàng
                </div>
            )}

            {/* Create Form */}
            {userPermissions.canManageProducts && !editingProduct && (
                <div style={{ marginBottom: '30px', border: '1px solid #ddd', padding: '20px', borderRadius: '8px', background: '#f8f9fa' }}>
                    <h3 style={{ marginTop: 0 }}>➕ Thêm Sản phẩm Mới</h3>
                    <form onSubmit={handleCreate}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>SKU</label>
                                <input
                                    type="text"
                                    placeholder="Mã sản phẩm (tùy chọn)"
                                    value={formData.sku}
                                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tên sản phẩm *</label>
                                <input
                                    type="text"
                                    placeholder="Nhập tên sản phẩm"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Danh mục</label>
                                <select
                                    value={formData.product_category_id}
                                    onChange={e => setFormData({ ...formData, product_category_id: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                >
                                    <option value="">-- Chọn danh mục --</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Thương hiệu</label>
                                <input
                                    type="text"
                                    placeholder="VD: Samsung, Apple..."
                                    value={formData.brand}
                                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Khối lượng (g)</label>
                                <input
                                    type="number"
                                    placeholder="Gram"
                                    value={formData.weight}
                                    onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Mô tả</label>
                            <textarea
                                placeholder="Mô tả sản phẩm"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Giá (VNĐ) *</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    required
                                    min="0"
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Giảm giá (%)</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={formData.discount_percentage}
                                    onChange={e => setFormData({ ...formData, discount_percentage: e.target.value })}
                                    min="0"
                                    max="100"
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Trạng thái</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                >
                                    <option value="active">Hoạt động</option>
                                    <option value="inactive">Tạm dừng</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>URL Ảnh</label>
                            <input
                                type="text"
                                placeholder="https://example.com/image.jpg"
                                value={formData.thumbnail}
                                onChange={e => setFormData({ ...formData, thumbnail: e.target.value })}
                                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.featured}
                                    onChange={e => setFormData({ ...formData, featured: e.target.checked })}
                                />
                                <span style={{ fontWeight: 'bold' }}>Sản phẩm nổi bật</span>
                            </label>
                        </div>

                        <button type="submit" style={{ padding: '10px 20px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                            ➕ Tạo Sản phẩm
                        </button>
                    </form>
                </div>
            )}

            {/* Edit Form */}
            {editingProduct && (
                <div style={{ marginBottom: '30px', border: '2px solid #007bff', padding: '20px', borderRadius: '8px', background: '#e7f3ff' }}>
                    <h3 style={{ marginTop: 0 }}>✏️ Chỉnh Sửa Sản phẩm</h3>
                    <form onSubmit={handleUpdate}>
                        {/* Same form fields as create, but with update button */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>SKU</label>
                                <input
                                    type="text"
                                    value={formData.sku}
                                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tên sản phẩm *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Danh mục</label>
                                <select
                                    value={formData.product_category_id}
                                    onChange={e => setFormData({ ...formData, product_category_id: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                >
                                    <option value="">-- Chọn danh mục --</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Thương hiệu</label>
                                <input
                                    type="text"
                                    value={formData.brand}
                                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Khối lượng (g)</label>
                                <input
                                    type="number"
                                    value={formData.weight}
                                    onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Mô tả</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Giá (VNĐ) *</label>
                                <input
                                    type="number"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    required
                                    min="0"
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Giảm giá (%)</label>
                                <input
                                    type="number"
                                    value={formData.discount_percentage}
                                    onChange={e => setFormData({ ...formData, discount_percentage: e.target.value })}
                                    min="0"
                                    max="100"
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Trạng thái</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                >
                                    <option value="active">Hoạt động</option>
                                    <option value="inactive">Tạm dừng</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>URL Ảnh</label>
                            <input
                                type="text"
                                value={formData.thumbnail}
                                onChange={e => setFormData({ ...formData, thumbnail: e.target.value })}
                                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.featured}
                                    onChange={e => setFormData({ ...formData, featured: e.target.checked })}
                                />
                                <span style={{ fontWeight: 'bold' }}>Sản phẩm nổi bật</span>
                            </label>
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

            {/* Products Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #eee' }}>
                <thead>
                    <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Ảnh</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>SKU</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Tên sản phẩm</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Thương hiệu</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Giá</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Giảm giá</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Tồn kho</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Trạng thái</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map(product => (
                        <tr key={product.id}>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                                {product.thumbnail && (
                                    <img src={product.thumbnail} alt={product.title} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                                )}
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '13px', color: '#666' }}>
                                {product.sku || '-'}
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                                <strong>{product.title}</strong>
                                {product.featured && <span style={{ marginLeft: '8px', background: '#ffc107', color: '#000', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>⭐ Nổi bật</span>}
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '13px' }}>
                                {product.brand || '-'}
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                                {formatPrice(product.price)}
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                                {product.discount_percentage}%
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                                <span style={{ color: getTotalStock(product.inventory) < 10 ? 'red' : 'green', fontWeight: 'bold' }}>
                                    {getTotalStock(product.inventory)}
                                </span>
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                                {product.status === 'active' ?
                                    <span style={{ color: 'green', fontWeight: 'bold' }}>Hoạt động</span> :
                                    <span style={{ color: 'red' }}>Tạm dừng</span>
                                }
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                                {userPermissions.canManageProducts && (
                                    <button
                                        onClick={() => handleEdit(product)}
                                        style={{ padding: '5px 10px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}
                                    >
                                        ✏️ Sửa
                                    </button>
                                )}

                                {userPermissions.canDelete && (
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        style={{ padding: '5px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        🗑️ Xóa
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {products.length === 0 && (
                        <tr>
                            <td colSpan="9" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                                Không có sản phẩm nào
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Products;
