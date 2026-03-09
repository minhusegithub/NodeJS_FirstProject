import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';

const StoreRevenueStat = sequelize.define('StoreRevenueStat', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    store_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    report_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    total_revenue: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0
    },
    total_orders: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    unique_customers: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    total_items_sold: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'store_revenue_stats',
    timestamps: true,
    underscored: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at',
    indexes: [
        {
            unique: true,
            fields: ['store_id', 'report_date']
        },
        {
            fields: ['report_date']
        }
    ]
});

export default StoreRevenueStat;
