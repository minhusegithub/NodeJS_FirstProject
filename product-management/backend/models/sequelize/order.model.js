import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: { // Order ID visible to user (e.g. #ORD-12345)
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        // references User
    },
    store_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Can be null initially if system auto-assigns later, but better required.
        // references Store
    },
    // User Info Snapshot (in case Address/Phone changes later)
    user_info: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: '{fullName, phone, address, email}'
    },
    total_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
    },
    payment_method: {
        type: DataTypes.STRING(20),
        defaultValue: 'COD',
        validate: {
            isIn: [['COD', 'VNPay', 'Banking']]
        }
    },
    payment_status: {
        type: DataTypes.STRING(20),
        defaultValue: 'pending',
        validate: {
            isIn: [['pending', 'paid', 'failed', 'refunded']]
        }
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'pending',
        validate: {
            isIn: [['pending', 'confirmed', 'shipping', 'delivered', 'cancelled_no_refund', 'cancelled_refund']]
        }
    },
    confirmed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    shipped_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    delivered_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
   
    vnp_transaction_id: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Migration helper
    original_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true
    }
}, {
    tableName: 'orders',
    timestamps: true,
    underscored: true,
    paranoid: true, // Soft delete
    hooks: {
        beforeUpdate: (order) => {
            if (!order.changed('status')) return;

            const now = new Date();
            const nextStatus = order.getDataValue('status');

            if (nextStatus === 'confirmed' && !order.getDataValue('confirmed_at')) {
                order.setDataValue('confirmed_at', now);
            } else if (nextStatus === 'shipping' && !order.getDataValue('shipped_at')) {
                if (!order.getDataValue('confirmed_at')) {
                    order.setDataValue('confirmed_at', now);
                }
                order.setDataValue('shipped_at', now);
            } else if (nextStatus === 'delivered' && !order.getDataValue('delivered_at')) {
                if (!order.getDataValue('confirmed_at')) {
                    order.setDataValue('confirmed_at', now);
                }
                if (!order.getDataValue('shipped_at')) {
                    order.setDataValue('shipped_at', now);
                }
                order.setDataValue('delivered_at', now);
            }
        }
    },
    indexes: [
        {
            unique: true,
            fields: ['code']
        },
        {
            fields: ['user_id']
        },
        {
            fields: ['store_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['created_at']
        },
        {
            fields: ['confirmed_at']
        },
        {
            fields: ['shipped_at']
        },
        {
            fields: ['delivered_at']
        }
    ]
});

export default Order;
