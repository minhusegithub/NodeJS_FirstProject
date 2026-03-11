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
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'active',
        validate: {
            isIn: [['active', 'inactive']]
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
        },
        {
            fields: ['status']
        }
    ]
});

export default ProductStoreInventory;
