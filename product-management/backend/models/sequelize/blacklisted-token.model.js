import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';

const BlacklistedToken = sequelize.define('BlacklistedToken', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    jti: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'JWT ID of the blacklisted token'
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'User ID who owned the token'
    },
    token_type: {
        type: DataTypes.ENUM('access', 'refresh'),
        allowNull: false,
        defaultValue: 'refresh',
        comment: 'Type of token'
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Token expiration time'
    },
    blacklisted_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When the token was blacklisted'
    },
    reason: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Reason for blacklisting (logout, security, etc.)'
    }
}, {
    tableName: 'blacklisted_tokens',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: false,
    indexes: [
        {
            fields: ['jti']
        },
        {
            fields: ['expires_at']
        },
        {
            fields: ['user_id']
        }
    ]
});

export default BlacklistedToken;

