import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    full_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    token_user: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    avatar: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'active',
        validate: {
            isIn: [['active', 'inactive', 'banned']]
        }
    },
    status_online: {
        type: DataTypes.STRING(20),
        defaultValue: 'offline'
    },
    // For simple Friend/Chat migration (if needed later)
    friend_list: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    // Migration helper
    original_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true
    }
}, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    paranoid: true, // Soft delete (creates deleted_at column)
    indexes: [
        {
            unique: true,
            fields: ['email']
        },
        {
            fields: ['token_user']
        }
    ]
});

export default User;
