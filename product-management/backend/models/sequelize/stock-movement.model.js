import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';

const StockMovement = sequelize.define('StockMovement', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'products',
            key: 'id'
        },
        comment: 'Product ID (if not variant)'
    },
    variant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'product_variants',
            key: 'id'
        },
        comment: 'Variant ID (if applicable)'
    },
    store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'stores',
            key: 'id'
        }
    },
    movement_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
            isIn: [['import', 'export', 'adjustment', 'return', 'damaged', 'transfer_in', 'transfer_out']]
        },
        comment: 'Type of stock movement'
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Quantity change (positive for increase, negative for decrease)'
    },
    reference_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Type of reference: order, manual, supplier_import, etc.'
    },
    reference_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID of related order/transfer/etc'
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'User who performed this movement'
    }
}, {
    tableName: 'stock_movements',
    timestamps: true,
    underscored: true,
    updatedAt: false, // Stock movements are immutable once created
    indexes: [
        {
            fields: ['product_id']
        },
        {
            fields: ['variant_id']
        },
        {
            fields: ['store_id']
        },
        {
            fields: ['movement_type']
        },
        {
            fields: ['created_at']
        },
        {
            fields: ['reference_type', 'reference_id']
        }
    ]
});

export default StockMovement;
