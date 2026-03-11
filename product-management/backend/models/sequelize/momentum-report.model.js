import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';

const MomentumReport = sequelize.define('MomentumReport', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    store_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    current_qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    prev_qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    momentum_score: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    label: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'STABLE',
        validate: {
            isIn: [['SKYROCKETING', 'RISING', 'STABLE', 'COOLING']]
        }
    },
    calculated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'momentum_reports',
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
            fields: ['momentum_score']
        },
        {
            fields: ['label']
        },
        {
            fields: ['calculated_at']
        }
    ]
});

export default MomentumReport;
