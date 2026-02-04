import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';

const Role = sequelize.define('Role', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    permissions: {
        type: DataTypes.JSONB,
        defaultValue: [],
        allowNull: false,
        comment: 'Array of permission strings e.g. ["manage_store", "view_orders"]'
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    scope: {
        type: DataTypes.STRING(20),
        defaultValue: 'store',
        allowNull: false,
        validate: {
            isIn: [['store', 'system']]
        },
        comment: 'Scope of role: "store" for store-specific, "system" for system-wide'
    }
}, {
    tableName: 'roles',
    timestamps: true,
    underscored: true
});

export default Role;
