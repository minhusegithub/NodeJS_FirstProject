import sequelize from '../../config/database.sequelize.js';
import User from './user.model.js';
import ProductCategory from './product-category.model.js';
import Product from './product.model.js';
import ProductVariant from './product-variant.model.js';
import Store from './store.model.js';
import Order from './order.model.js';
import OrderItem from './order-item.model.js';
import ProductStoreInventory from './product-store-inventory.model.js';
import StoreStaff from './store-staff.model.js';
import Role from './role.model.js';
import StockMovement from './stock-movement.model.js';
import Cart from './cart.model.js';
import CartItem from './cart-item.model.js';
import BlacklistedToken from './blacklisted-token.model.js';
import StoreRevenueStat from './store-revenue-stat.model.js';
import DsiReport from './dsi-report.model.js';
import MomentumReport from './momentum-report.model.js';
import FulfillmentReport from './fulfillment-report.model.js';
import TransferSuggestion from './transfer-suggestion.model.js';
import InventoryTransferRequest from './inventory-transfer-request.model.js';
import InventoryTransferItem from './inventory-transfer-item.model.js';

// Define model associations
const setupAssociations = () => {
    // Store has many ProductStoreInventory
    Store.hasMany(ProductStoreInventory, {
        foreignKey: 'store_id',
        as: 'inventory'
    });

    ProductStoreInventory.belongsTo(Store, {
        foreignKey: 'store_id',
        as: 'store'
    });

    // Product associations
    Product.hasMany(ProductStoreInventory, {
        foreignKey: 'product_id',
        as: 'inventory'
    });

    ProductStoreInventory.belongsTo(Product, {
        foreignKey: 'product_id',
        as: 'product'
    });

    // ProductVariant associations
    Product.hasMany(ProductVariant, {
        foreignKey: 'product_id',
        as: 'variants'
    });

    ProductVariant.belongsTo(Product, {
        foreignKey: 'product_id',
        as: 'parent_product'
    });

    // StockMovement associations
    StockMovement.belongsTo(Product, {
        foreignKey: 'product_id',
        as: 'product'
    });

    StockMovement.belongsTo(ProductVariant, {
        foreignKey: 'variant_id',
        as: 'variant'
    });

    StockMovement.belongsTo(Store, {
        foreignKey: 'store_id',
        as: 'store'
    });

    StockMovement.belongsTo(User, {
        foreignKey: 'created_by',
        as: 'creator'
    });

    Product.hasMany(StockMovement, {
        foreignKey: 'product_id',
        as: 'stock_movements'
    });

    ProductVariant.hasMany(StockMovement, {
        foreignKey: 'variant_id',
        as: 'stock_movements'
    });

    Store.hasMany(StockMovement, {
        foreignKey: 'store_id',
        as: 'stock_movements'
    });

    // Store has many StoreStaff
    Store.hasMany(StoreStaff, {
        foreignKey: 'store_id',
        as: 'staff'
    });

    StoreStaff.belongsTo(Store, {
        foreignKey: 'store_id',
        as: 'store'
    });

    // StoreStaff Roles
    StoreStaff.belongsTo(Role, {
        foreignKey: 'role_id',
        as: 'role_data'
    });

    Role.hasMany(StoreStaff, {
        foreignKey: 'role_id',
        as: 'staff_members'
    });

    // User associations
    User.hasMany(StoreStaff, {
        foreignKey: 'user_id',
        as: 'store_roles'
    });

    StoreStaff.belongsTo(User, {
        foreignKey: 'user_id',
        as: 'user'
    });

    // Store manager association
    Store.belongsTo(User, {
        foreignKey: 'manager_id',
        as: 'manager'
    });

    // Valid Category Associations
    ProductCategory.hasMany(Product, {
        foreignKey: 'product_category_id',
        as: 'products'
    });

    Product.belongsTo(ProductCategory, {
        foreignKey: 'product_category_id',
        as: 'category'
    });

    // Category Self-Reference (Parent/Children)
    ProductCategory.hasMany(ProductCategory, {
        foreignKey: 'parent_id',
        as: 'children'
    });

    ProductCategory.belongsTo(ProductCategory, {
        foreignKey: 'parent_id',
        as: 'parent'
    });

    // Order Associations
    User.hasMany(Order, {
        foreignKey: 'user_id',
        as: 'orders'
    });
    Order.belongsTo(User, {
        foreignKey: 'user_id',
        as: 'user'
    });

    Store.hasMany(Order, {
        foreignKey: 'store_id',
        as: 'orders'
    });
    Order.belongsTo(Store, {
        foreignKey: 'store_id',
        as: 'store'
    });

    Order.hasMany(OrderItem, {
        foreignKey: 'order_id',
        as: 'items'
    });
    OrderItem.belongsTo(Order, {
        foreignKey: 'order_id',
        as: 'order'
    });

    Product.hasMany(OrderItem, {
        foreignKey: 'product_id',
        as: 'sold_items'
    });
    OrderItem.belongsTo(Product, {
        foreignKey: 'product_id',
        as: 'product'
    });

    // Cart associations
    User.hasOne(Cart, {
        foreignKey: 'user_id',
        as: 'cart'
    });

    Cart.belongsTo(User, {
        foreignKey: 'user_id',
        as: 'user'
    });

    Cart.hasMany(CartItem, {
        foreignKey: 'cart_id',
        as: 'items'
    });

    CartItem.belongsTo(Cart, {
        foreignKey: 'cart_id',
        as: 'cart'
    });

    CartItem.belongsTo(ProductStoreInventory, {
        foreignKey: 'inventory_id',
        as: 'inventory'
    });

    ProductStoreInventory.hasMany(CartItem, {
        foreignKey: 'inventory_id',
        as: 'cart_items'
    });

    // StoreRevenueStat associations
    Store.hasMany(StoreRevenueStat, {
        foreignKey: 'store_id',
        as: 'revenueStats'
    });

    StoreRevenueStat.belongsTo(Store, {
        foreignKey: 'store_id',
        as: 'store'
    });

    // DsiReport associations
    Store.hasMany(DsiReport, {
        foreignKey: 'store_id',
        as: 'dsiReports'
    });

    DsiReport.belongsTo(Store, {
        foreignKey: 'store_id',
        as: 'store'
    });

    Product.hasMany(DsiReport, {
        foreignKey: 'product_id',
        as: 'dsiReports'
    });

    DsiReport.belongsTo(Product, {
        foreignKey: 'product_id',
        as: 'product'
    });
    
    // MomentumReport associations
    Store.hasMany(MomentumReport, {
        foreignKey: 'store_id',
        as: 'momentumReports'
    });
    
    MomentumReport.belongsTo(Store, {
        foreignKey: 'store_id',
        as: 'store'
    });
    
    Product.hasMany(MomentumReport, {
        foreignKey: 'product_id',
        as: 'momentumReports'
    });
    
    MomentumReport.belongsTo(Product, {
        foreignKey: 'product_id',
        as: 'product'
    });

    // FulfillmentReport associations
    Store.hasMany(FulfillmentReport, {
        foreignKey: 'store_id',
        as: 'fulfillmentReports'
    });

    FulfillmentReport.belongsTo(Store, {
        foreignKey: 'store_id',
        as: 'store'
    });

    // ===== Transfer Suggestion associations =====
    TransferSuggestion.belongsTo(Store, {
        foreignKey: 'source_store_id',
        as: 'sourceStore'
    });

    TransferSuggestion.belongsTo(Store, {
        foreignKey: 'dest_store_id',
        as: 'destStore'
    });

    TransferSuggestion.belongsTo(Product, {
        foreignKey: 'product_id',
        as: 'product'
    });

    TransferSuggestion.belongsTo(User, {
        foreignKey: 'reviewed_by',
        as: 'reviewer'
    });

    Store.hasMany(TransferSuggestion, {
        foreignKey: 'source_store_id',
        as: 'outgoingSuggestions'
    });

    Store.hasMany(TransferSuggestion, {
        foreignKey: 'dest_store_id',
        as: 'incomingSuggestions'
    });

    Product.hasMany(TransferSuggestion, {
        foreignKey: 'product_id',
        as: 'transferSuggestions'
    });

    // ===== Inventory Transfer Request associations =====
    InventoryTransferRequest.belongsTo(Store, {
        foreignKey: 'source_store_id',
        as: 'sourceStore'
    });

    InventoryTransferRequest.belongsTo(Store, {
        foreignKey: 'dest_store_id',
        as: 'destStore'
    });

    InventoryTransferRequest.belongsTo(User, {
        foreignKey: 'created_by',
        as: 'creator'
    });

    InventoryTransferRequest.belongsTo(User, {
        foreignKey: 'approved_by',
        as: 'approver'
    });

    InventoryTransferRequest.belongsTo(TransferSuggestion, {
        foreignKey: 'suggestion_id',
        as: 'suggestion'
    });

    TransferSuggestion.hasOne(InventoryTransferRequest, {
        foreignKey: 'suggestion_id',
        as: 'transferRequest'
    });

    InventoryTransferRequest.hasMany(InventoryTransferItem, {
        foreignKey: 'transfer_request_id',
        as: 'items'
    });

    Store.hasMany(InventoryTransferRequest, {
        foreignKey: 'source_store_id',
        as: 'outgoingTransfers'
    });

    Store.hasMany(InventoryTransferRequest, {
        foreignKey: 'dest_store_id',
        as: 'incomingTransfers'
    });

    // ===== Inventory Transfer Item associations =====
    InventoryTransferItem.belongsTo(InventoryTransferRequest, {
        foreignKey: 'transfer_request_id',
        as: 'transferRequest'
    });

    InventoryTransferItem.belongsTo(Product, {
        foreignKey: 'product_id',
        as: 'product'
    });

    Product.hasMany(InventoryTransferItem, {
        foreignKey: 'product_id',
        as: 'transferItems'
    });
};

// Initialize associations
setupAssociations();

// Export models and sequelize instance
export {
    sequelize,
    User,
    ProductCategory,
    Product,
    ProductVariant,
    Store,
    ProductStoreInventory,
    StoreStaff,
    Order,
    OrderItem,
    Role,
    StockMovement,
    Cart,
    CartItem,
    BlacklistedToken,
    StoreRevenueStat,
    DsiReport,
    MomentumReport,
    FulfillmentReport,
    TransferSuggestion,
    InventoryTransferRequest,
    InventoryTransferItem
};

export default {
    sequelize,
    User,
    ProductCategory,
    Product,
    ProductVariant,
    Store,
    ProductStoreInventory,
    StoreStaff,
    Order,
    OrderItem,
    Role,
    StockMovement,
    Cart,
    CartItem,
    BlacklistedToken,
    StoreRevenueStat,
    DsiReport,
    MomentumReport,
    FulfillmentReport,
    TransferSuggestion,
    InventoryTransferRequest,
    InventoryTransferItem
};
