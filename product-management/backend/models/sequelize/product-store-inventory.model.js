import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';

const ProductStoreInventory = sequelize.define('ProductStoreInventory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'stores',
            key: 'id'
        }
    },
    stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
            min: 0
        }
    },
    reserved_stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
            min: 0
        },
        comment: 'Stock reserved for pending orders'
    },
    min_stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Minimum stock level - alert when below this'
    },
    max_stock: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Maximum stock capacity for this store'
    },
    store_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Store-specific price (overrides product base price if set)'
    },
    location: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Warehouse location (shelf, aisle, bin)'
    },
    last_restock_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last time inventory was restocked'
    }
}, {
    tableName: 'product_store_inventory',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['product_id', 'store_id']
        },
        {
            fields: ['store_id']
        },
        {
            fields: ['product_id']
        }
    ]
});

export default ProductStoreInventory;
