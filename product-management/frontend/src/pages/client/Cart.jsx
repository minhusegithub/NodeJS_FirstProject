import { useEffect, useState, useRef } from 'react';
import { useCartStore } from '../../stores/cartStore';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const Cart = () => {
    const navigate = useNavigate();
    const { cart, totalPrice, loading, getCart, updateQuantity, deleteItem, getCartCount } = useCartStore();
    const [localQuantities, setLocalQuantities] = useState({});
    const debounceTimers = useRef({});

    useEffect(() => {
        getCart();
    }, [getCart]);

    // Sync local quantities with cart data
    useEffect(() => {
        const quantities = {};
        cart.forEach(item => {
            quantities[item.product_id] = item.quantity;
        });
        setLocalQuantities(quantities);
    }, [cart]);

    const handleQuantityChange = (productId, newQuantity) => {
        if (newQuantity < 1) return;

        // Find the product to check stock
        const product = cart.find(item => item.product_id === productId);

        // Check if quantity exceeds stock
        if (product && newQuantity > product.stock) {
            toast.error(`Hiện tại chỉ còn ${product.stock} sản phẩm!`);
            // Reset to 1
            setLocalQuantities(prev => ({
                ...prev,
                [productId]: 1
            }));

            // Update backend with quantity 1
            setTimeout(async () => {
                try {
                    await updateQuantity(productId, 1);
                } catch (error) {
                    console.error(error);
                }
            }, 500);
            return;
        }

        // Update local state immediately for responsive UI
        setLocalQuantities(prev => ({
            ...prev,
            [productId]: newQuantity
        }));

        // Clear existing timer for this product
        if (debounceTimers.current[productId]) {
            clearTimeout(debounceTimers.current[productId]);
        }

        // Set new timer to update backend after 1000ms of no typing
        debounceTimers.current[productId] = setTimeout(async () => {
            try {
                await updateQuantity(productId, newQuantity);
            } catch (error) {
                console.error(error);
                // Revert to original quantity on error
                const originalItem = cart.find(item => item.product_id === productId);
                if (originalItem) {
                    setLocalQuantities(prev => ({
                        ...prev,
                        [productId]: originalItem.quantity
                    }));
                }
            }
        }, 1000);
    };

    const handleDelete = async (productId) => {
        if (window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
            try {
                await deleteItem(productId);
            } catch (error) {
                console.error(error);
            }
        }
    };

    if (loading) {
        return (
            <div className="container my-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Đang tải...</span>
                </div>
                <p className="mt-3">Đang tải giỏ hàng...</p>
            </div>
        );
    }

    const totalQuantity = getCartCount();

    return (
        <div className="container my-3">
            <div className="row">
                <div className="col-12">
                    <div className="box-head mb-3">
                        <h4 className="inner-title">Giỏ hàng</h4>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-12">
                    <div className="card cart-card border-0 shadow-sm">
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table cart-table align-middle mb-0">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Ảnh</th>
                                            <th>Tên sản phẩm</th>
                                            <th>Giá</th>
                                            <th>Số lượng</th>
                                            <th>Tổng tiền</th>
                                            <th>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cart.length > 0 ? (
                                            cart.map((item, index) => (
                                                <tr key={item.product_id}>
                                                    <td>{index + 1}</td>
                                                    <td>
                                                        <img
                                                            src={item.thumbnail}
                                                            alt={item.title}
                                                            className="rounded border"
                                                            width="80px"
                                                        />
                                                    </td>
                                                    <td>
                                                        <Link
                                                            to={`/products/${item.slug}`}
                                                            className="fw-semibold text-dark text-decoration-none"
                                                        >
                                                            {item.title}
                                                        </Link>
                                                    </td>
                                                    <td>{item.priceNew}$</td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="form-control quantity-input"
                                                            value={localQuantities[item.product_id] || item.quantity}
                                                            min="1"
                                                            max={item.stock}
                                                            onChange={(e) => handleQuantityChange(
                                                                item.product_id,
                                                                parseInt(e.target.value) || 1
                                                            )}
                                                        />
                                                    </td>
                                                    <td>{item.totalPrice}$</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-delete-cart"
                                                            onClick={() => handleDelete(item.product_id)}
                                                        >
                                                            Xóa
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="text-center text-muted py-4">
                                                    Không có sản phẩm nào trong giỏ hàng
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3">
                                <h3 className="mb-0 fs-5 text-primary">
                                    Tổng đơn hàng:
                                    <span className="text-success fw-semibold ms-2">{totalPrice}$</span>
                                </h3>
                                {totalQuantity > 0 && totalQuantity <= 20 && (
                                    <button
                                        className="btn btn-primary px-4"
                                        onClick={() => navigate('/checkout')}
                                    >
                                        THANH TOÁN
                                    </button>
                                )}
                                {totalQuantity > 20 && (
                                    <p className="text-danger mb-0 fw-semibold">
                                        Số lượng sản phẩm trong giỏ hàng không được vượt quá 20 sản phẩm
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
