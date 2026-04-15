import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';

const InventoryTransferItem = sequelize.define('InventoryTransferItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    transfer_request_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'inventory_transfer_requests',
            key: 'id'
        },
        comment: 'Parent transfer request'
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        },
        comment: 'Product being transferred'
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1
        },
        comment: 'Quantity to transfer'
    },
    received_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        },
        comment: 'Actual quantity received (may differ from sent quantity)'
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Per-item notes (e.g. damage notes)'
    }
}, {
    tableName: 'inventory_transfer_items',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['transfer_request_id']
        },
        {
            fields: ['product_id']
        },
        {
            unique: true,
            fields: ['transfer_request_id', 'product_id']
        }
    ]
});

export default InventoryTransferItem;
