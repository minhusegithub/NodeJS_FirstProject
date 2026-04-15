import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';

const TransferSuggestion = sequelize.define('TransferSuggestion', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    source_store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'stores',
            key: 'id'
        },
        comment: 'Store that will send inventory'
    },
    dest_store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'stores',
            key: 'id'
        },
        comment: 'Store that needs inventory'
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        },
        comment: 'Product to transfer'
    },
    suggested_qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1
        },
        comment: 'Suggested quantity to transfer'
    },
    mfts_score: {
        type: DataTypes.DECIMAL(8, 4),
        allowNull: false,
        comment: 'Multi-Factor Transfer Score (0-1)'
    },
    score_distance: {
        type: DataTypes.DECIMAL(6, 4),
        allowNull: false,
        defaultValue: 0,
        comment: 'Distance factor score component'
    },
    score_surplus: {
        type: DataTypes.DECIMAL(6, 4),
        allowNull: false,
        defaultValue: 0,
        comment: 'Surplus factor score component'
    },
    score_cost: {
        type: DataTypes.DECIMAL(6, 4),
        allowNull: false,
        defaultValue: 0,
        comment: 'Cost factor score component'
    },
    distance_km: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Haversine distance between stores (km)'
    },
    estimated_cost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Estimated transfer cost (VND)'
    },
    source_stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Source store stock at calculation time'
    },
    dest_stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Dest store stock at calculation time'
    },
    dest_velocity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Dest store sales velocity (last 30 days)'
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Auto-generated human-readable reason in Vietnamese'
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
            isIn: [['pending', 'approved', 'rejected', 'expired']]
        }
    },
    reviewed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'User who reviewed this suggestion'
    },
    reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    transfer_request_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Created transfer request ID (after approval)'
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Suggestion expires after this time (default 48h)'
    },
    calculated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When the MFTS algorithm produced this suggestion'
    }
}, {
    tableName: 'transfer_suggestions',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['source_store_id']
        },
        {
            fields: ['dest_store_id']
        },
        {
            fields: ['product_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['mfts_score']
        },
        {
            fields: ['expires_at']
        },
        {
            fields: ['calculated_at']
        }
    ]
});

export default TransferSuggestion;
