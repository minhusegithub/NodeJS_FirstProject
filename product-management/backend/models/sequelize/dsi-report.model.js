import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';

const DsiReport = sequelize.define('DsiReport', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Reference to Store'
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Reference to Product'
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Snapshot stock at calculation time'
    },
    capital_tied_up: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: 'V = stock * price'
    },
    days_stale: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'D = days since last sale or fallback restock/create date'
    },
    velocity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'R = quantity sold in last 30 days'
    },
    dsi_score: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
        comment: 'DSI = (D * V) / (R + 1)'
    },
    risk_level: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
            isIn: [['CRITICAL', 'WARNING', 'SAFE']]
        },
        comment: 'CRITICAL, WARNING, SAFE'
    },
    calculated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When this report row was calculated'
    }
}, {
    tableName: 'dsi_reports',
    timestamps: true,
    underscored: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at',
    indexes: [
        {
            unique: true,
            fields: ['store_id', 'product_id']
        },
        {
            fields: ['dsi_score']
        },
        {
            fields: ['risk_level']
        }
    ]
});

export default DsiReport;
