import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';

const StoreStaff = sequelize.define('StoreStaff', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    store_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Nullable for system-wide roles like SystemAdmin
        references: {
            model: 'stores',
            key: 'id'
        }
    },
    role_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Allow user to be in a store without a specific role initially
        references: {
            model: 'roles',
            key: 'id'
        }
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'store_staff',
    timestamps: true,
    underscored: true,
    indexes: [
        // Removed unique constraint on [user_id, store_id] to allow NULL store_id
        // A user can have multiple roles across different stores, or system-wide roles
        {
            fields: ['store_id']
        },
        {
            fields: ['user_id']
        },
        {
            fields: ['role_id']
        }
    ]
});

export default StoreStaff;
