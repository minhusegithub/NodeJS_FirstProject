import { useEffect, useState, useRef } from 'react';
import { useCartStore } from '../../stores/cartStore';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import '../../assets/styles/cart.css';

const Cart = () => {
    const navigate = useNavigate();
    const {
        cart,
        selectedItems,
        loading,
        getCart,
        updateCartItem,
        removeCartItem,
        clearCart,
        toggleItemSelection,
        toggleSelectAll,
        getSelectedTotal
    } = useCartStore();

    const [localQuantities, setLocalQuantities] = useState({});
    const debounceTimers = useRef({});

    useEffect(() => {
        getCart();
    }, [getCart]);

    // Sync local quantities
    useEffect(() => {
        const quantities = {};
        if (Array.isArray(cart)) {
            cart.forEach(item => {
                quantities[item.id] = item.quantity;
            });
        }
        setLocalQuantities(quantities);
    }, [cart]);

    // Group items by store
    const groupedCart = Array.isArray(cart) ? cart.reduce((acc, item) => {
        const storeId = item.store.id;
        if (!acc[storeId]) {
            acc[storeId] = {
                store: item.store,
                items: []
            };
        }
        acc[storeId].items.push(item);
        return acc;
    }, {}) : {};

    const handleQuantityChange = (cartItemId, newQuantity) => {
        if (newQuantity < 1) return;

        const item = cart.find(i => i.id === cartItemId);

        if (item && newQuantity > item.stock) {
            toast.error(`Cửa hàng chỉ còn ${item.stock} sản phẩm này!`);
            setLocalQuantities(prev => ({ ...prev, [cartItemId]: item.stock }));

            if (item.quantity !== item.stock) {
                clearTimeout(debounceTimers.current[cartItemId]);
                debounceTimers.current[cartItemId] = setTimeout(async () => {
                    try {
                        await updateCartItem(cartItemId, item.stock);
                    } catch (error) {
                        console.error(error);
                    }
                }, 500);
            }
            return;
        }

        setLocalQuantities(prev => ({ ...prev, [cartItemId]: newQuantity }));

        if (debounceTimers.current[cartItemId]) {
            clearTimeout(debounceTimers.current[cartItemId]);
        }

        debounceTimers.current[cartItemId] = setTimeout(async () => {
            try {
                await updateCartItem(cartItemId, newQuantity);
            } catch (error) {
                console.error(error);
                const originalItem = cart.find(i => i.id === cartItemId);
                if (originalItem) {
                    setLocalQuantities(prev => ({ ...prev, [cartItemId]: originalItem.quantity }));
                }
            }
        }, 500);
    };

    const handleDelete = async (cartItemId) => {
        if (window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
            try {
                await removeCartItem(cartItemId);
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleClearCart = async () => {
        if (window.confirm('Bạn có chắc muốn xóa tất cả sản phẩm trong giỏ hàng?')) {
            try {
                await clearCart();
            } catch (error) {
                console.error(error);
            }
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price || 0);
    };

    const isAllSelected = cart.length > 0 && selectedItems.length === cart.length;
    const selectedTotal = getSelectedTotal();

    let globalStt = 1; // Global STT counter

    if (loading) {
        return (
            <div className="container" style={{ marginTop: '100px', textAlign: 'center' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Đang tải...</span>
                </div>
                <p className="mt-3">Đang tải giỏ hàng...</p>
            </div>
        );
    }

    if (!cart || cart.length === 0) {
        return (
            <div className="container" style={{ marginTop: '100px', textAlign: 'center' }}>
                <div className="empty-cart">
                    <img src="https://cdn-icons-png.flaticon.com/512/11329/11329060.png" alt="Empty Cart" style={{ width: '150px', marginBottom: '20px' }} />
                    <h3>Giỏ hàng của bạn đang trống</h3>
                    <p className="text-muted">Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm.</p>
                    <Link to="/products" className="btn btn-primary mt-3" style={{ padding: '10px 24px' }}>
                        Mua sắm ngay
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="cart-page py-5 bg-light" style={{ minHeight: '80vh' }}>
            <div className="container">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold mb-0" style={{ color: '#1E4A7B' }}>Giỏ hàng</h2>
                    <div className="text-muted">
                        Bạn đang có <strong>{cart.length}</strong> sản phẩm trong giỏ
                    </div>
                </div>

                <div className="row">
                    <div className="col-lg-9">
                        {/* Global Actions */}
                        <div className="bg-white p-3 rounded shadow-sm mb-3 d-flex justify-content-between align-items-center">
                            <div className="form-check">
                                <input
                                    className="form-check-input custom-checkbox"
                                    type="checkbox"
                                    id="selectAll"
                                    checked={isAllSelected}
                                    onChange={(e) => toggleSelectAll(e.target.checked)}
                                />
                                <label className="form-check-label ms-2 fw-semibold user-select-none" htmlFor="selectAll">
                                    Chọn tất cả ({cart.length})
                                </label>
                            </div>
                            <button onClick={handleClearCart} className="btn btn-link text-danger text-decoration-none p-0">
                                <i className="fa-solid fa-trash me-1"></i> Xóa tất cả
                            </button>
                        </div>

                        {/* Cart Items Grouped by Store */}
                        {Object.values(groupedCart).map((group) => (
                            <div key={group.store.id} className="store-group-table bg-white shadow-sm" style={{ marginBottom: '75px' }}>
                                <div className="store-group-header">
                                    <span className="store-icon"><i className="fa-solid fa-shop"></i></span>
                                    <span className="store-name">{group.store.name}</span>
                                    <span className="text-muted small ms-2">({group.items.length})</span>
                                </div>
                                <div className="table-responsive">
                                    <table className="table cart-table mb-0">
                                        <thead>
                                            <tr>
                                                <th scope="col" style={{ width: '50px' }}>STT</th>
                                                <th scope="col" style={{ width: '50px' }}>Chọn</th>
                                                <th scope="col" className="text-start ps-4">Sản phẩm</th>
                                                <th scope="col">Đơn giá</th>
                                                <th scope="col">Số lượng</th>
                                                <th scope="col">Thành tiền</th>
                                                <th scope="col">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.items.map((item) => {
                                                // Round currentPrice to integer after applying discount
                                                const currentPrice = Math.round(item.product.price * (100 - (item.product.discount_percentage || 0)) / 100);
                                                const currentStt = globalStt++;

                                                return (
                                                    <tr key={item.id}>
                                                        {/* STT Column */}
                                                        <td className="text-center fw-bold text-muted">{currentStt}</td>

                                                        {/* Checkbox Column */}
                                                        <td className="text-center">
                                                            <input
                                                                type="checkbox"
                                                                className="custom-checkbox"
                                                                checked={selectedItems.includes(item.id)}
                                                                onChange={() => toggleItemSelection(item.id)}
                                                            />
                                                        </td>

                                                        <td className="text-start ps-4">
                                                            <div className="d-flex align-items-center gap-3">
                                                                <div className="flex-shrink-0" style={{ width: '64px', height: '64px' }}>
                                                                    <img
                                                                        src={item.product.thumbnail}
                                                                        alt={item.product.title}
                                                                        className="img-fluid rounded border"
                                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Link to={`/products/${item.product.slug}`} className="text-decoration-none text-dark fw-bold d-block mb-1">
                                                                        {item.product.title}
                                                                    </Link>

                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="fw-semibold">
                                                                {formatPrice(currentPrice)}
                                                            </div>
                                                            {item.product.discount_percentage > 0 && (
                                                                <small className="text-decoration-line-through text-muted ms-1">
                                                                    {formatPrice(item.product.price)}
                                                                </small>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                className="form-control quantity-input text-center"
                                                                value={localQuantities[item.id] || ''}
                                                                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                                                                min="1"
                                                                max={item.stock}
                                                            />
                                                            <div className="small text-muted mt-1">
                                                                Kho: {item.stock}
                                                            </div>
                                                        </td>
                                                        <td className="fw-bold text-primary">
                                                            {formatPrice(
                                                                currentPrice * (localQuantities[item.id] || item.quantity)
                                                            )}
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="btn btn-delete-cart btn-sm px-3 py-2"
                                                                onClick={() => handleDelete(item.id)}
                                                                title="Xóa sản phẩm"
                                                            >
                                                                <i className="fa-solid fa-trash-can"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary Sidebar */}
                    <div className="col-lg-3">
                        <div className="cart-card p-4 position-sticky" style={{ top: '20px' }}>
                            <h5 className="fw-bold mb-4">Thanh toán</h5>

                            <div className="d-flex justify-content-between mb-3">
                                <span className="text-muted">Đã chọn</span>
                                <span className="fw-bold">{selectedItems.length} sản phẩm</span>
                            </div>

                            <div className="d-flex justify-content-between mb-3">
                                <span className="text-muted">Tạm tính</span>
                                <span className="fw-bold">{formatPrice(selectedTotal)}</span>
                            </div>

                            <div className="d-flex justify-content-between mb-4">
                                <span className="text-muted">Vận chuyển</span>
                                <span className="text-success fw-bold">Miễn phí</span>
                            </div>

                            <hr className="mb-4" style={{ borderColor: '#e2e8f0' }} />

                            <div className="d-flex justify-content-between mb-4 align-items-center">
                                <span className="fw-bold fs-6">Tổng cộng</span>
                                <span className="fw-bold fs-4 text-primary">{formatPrice(selectedTotal)}</span>
                            </div>

                            <button
                                className="btn btn-primary w-100 py-3 fw-bold text-uppercase"
                                onClick={() => navigate('/checkout')}
                                style={{ fontSize: '15px' }}
                                disabled={selectedItems.length === 0}
                            >
                                Mua hàng ({selectedItems.length})
                            </button>

                            <div className="mt-3 text-center">
                                <Link to="/products" className="text-decoration-none text-muted small">
                                    <i className="fa-solid fa-arrow-left me-1"></i> Tiếp tục mua sắm
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
