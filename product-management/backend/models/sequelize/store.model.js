import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';

const Store = sequelize.define('Store', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Unique store code (e.g., HN01, HCM01)'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    address: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Store address: {street, district, city}'
    },
    contact: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Contact info: {phone, email}'
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Store latitude coordinate'
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Store longitude coordinate'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    manager_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'User ID of store manager'
    }
}, {
    tableName: 'stores',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['code']
        },
        {
            fields: ['is_active']
        }
    ]
});

export default Store;
