import { useState, useEffect } from 'react';
import '../assets/styles/store-selection-modal.css';

const StoreSelectionModal = ({ product, onClose, onConfirm }) => {
    const [selectedStoreId, setSelectedStoreId] = useState(null);

    useEffect(() => {
        console.log('🏪 Modal mounted');
        console.log('Product:', product);
        console.log('Inventory:', product?.inventory);
    }, [product]);

    const handleStoreSelect = (inventoryId) => {
        console.log('Selected inventory ID:', inventoryId);
        setSelectedStoreId(inventoryId);
    };

    const handleConfirm = () => {
        console.log('Confirm clicked, selected:', selectedStoreId);
        if (!selectedStoreId) {
            alert('Vui lòng chọn cửa hàng!');
            return;
        }
        onConfirm(selectedStoreId);
    };

    const formatAddress = (address) => {
        if (typeof address === 'object') {
            return `${address.street || ''}, ${address.district || ''}, ${address.city || ''}`
                .trim()
                .replace(/, ,/g, ',')
                .replace(/^, |, $/g, '');
        }
        return address || 'Chưa có địa chỉ';
    };

    const formatContact = (contact) => {
        if (typeof contact === 'object') {
            return contact.phone || contact.email || 'N/A';
        }
        return contact || 'N/A';
    };

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Chọn cửa hàng</h2>
                    <button className="modal-close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    <p className="modal-instruction">
                        Vui lòng chọn <strong>1</strong> cửa hàng để mua sản phẩm:
                    </p>

                    <div className="stores-selection-list">
                        {product.inventory && product.inventory.map((inv) => (
                            <div
                                key={inv.id}
                                className={`store-selection-item ${selectedStoreId === inv.id ? 'selected' : ''} ${inv.stock === 0 ? 'out-of-stock' : ''}`}
                                onClick={() => inv.stock > 0 && handleStoreSelect(inv.id)}
                            >
                                <div className="store-radio">
                                    <input
                                        type="radio"
                                        name="store"
                                        checked={selectedStoreId === inv.id}
                                        onChange={() => inv.stock > 0 && handleStoreSelect(inv.id)}
                                        disabled={inv.stock === 0}
                                    />
                                </div>
                                <div className="store-selection-info">
                                    <h4>{inv.store.name}</h4>
                                    <p className="store-selection-address">
                                        {formatAddress(inv.store.address)}
                                    </p>
                                    <p className="store-selection-contact">
                                        Liên hệ: {formatContact(inv.store.contact)}
                                    </p>
                                    <div className="store-selection-stock">
                                        {inv.stock > 0 ? (
                                            <span className="stock-available">
                                                Còn {inv.stock} sản phẩm
                                            </span>
                                        ) : (
                                            <span className="stock-out">
                                                Hết hàng
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>
                        Hủy
                    </button>
                    <button
                        className="btn-confirm"
                        onClick={handleConfirm}
                        disabled={!selectedStoreId}
                    >
                        Xác nhận
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StoreSelectionModal;
