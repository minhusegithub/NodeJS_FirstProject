import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';

const InventoryTransferRequest = sequelize.define('InventoryTransferRequest', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    transfer_code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
        comment: 'Unique transfer code: TRF-YYYYMMDD-XXXX'
    },
    source_store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'stores',
            key: 'id'
        },
        comment: 'Store sending inventory'
    },
    dest_store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'stores',
            key: 'id'
        },
        comment: 'Store receiving inventory'
    },
    status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'draft',
        validate: {
            isIn: [['draft', 'pending_approval', 'approved', 'in_transit', 'received', 'completed', 'cancelled']]
        },
        comment: 'Transfer request lifecycle status'
    },
    total_items: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of distinct products'
    },
    total_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total quantity of all items'
    },
    estimated_cost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Estimated shipping cost (VND)'
    },
    distance_km: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Distance between source and dest stores (km)'
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Free-text notes'
    },
    suggestion_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Origin suggestion ID (null if created manually)'
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'User who created the request'
    },
    approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'User who approved the request'
    },
    shipped_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When inventory left source store'
    },
    received_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When inventory arrived at dest store'
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When transfer was finalized (quantities confirmed)'
    }
}, {
    tableName: 'inventory_transfer_requests',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['transfer_code']
        },
        {
            fields: ['source_store_id']
        },
        {
            fields: ['dest_store_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['suggestion_id']
        },
        {
            fields: ['created_by']
        },
        {
            fields: ['created_at']
        }
    ]
});

export default InventoryTransferRequest;
