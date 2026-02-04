import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';

const OrderItem = sequelize.define('OrderItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: false
        // references Order
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: true // Nullable in case product is hard deleted (though we use paranoid)
        // references Product
    },
    // SNAPSHOT DATA
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    thumbnail: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    price: { // Original price
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    discount_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0
    },
    price_new: { // Actual sold price
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1 }
    },
    total_price: { // price_new * quantity
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    }
}, {
    tableName: 'order_items',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['order_id']
        },
        {
            fields: ['product_id']
        }
    ]
});

export default OrderItem;
