import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';
import slugify from 'slugify';

const ProductCategory = sequelize.define('ProductCategory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    parent_id: {
        type: DataTypes.INTEGER, // Changed from String to Integer for self-reference
        allowNull: true,
        defaultValue: null
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    thumbnail: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'active',
        validate: {
            isIn: [['active', 'inactive']]
        }
    },
    slug: {
        type: DataTypes.STRING(255),
        unique: true
    },
    // Migration helper
    original_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true
    }
}, {
    tableName: 'product_categories',
    timestamps: true,
    underscored: true,
    paranoid: true, // Soft delete
    hooks: {
        beforeValidate: (category) => {
            if (category.title && !category.slug) {
                category.slug = slugify(category.title, { lower: true, strict: true });
            }
        }
    },
    indexes: [
        {
            unique: true,
            fields: ['slug']
        },
        {
            fields: ['status']
        },
        {
            fields: ['parent_id']
        }
    ]
});

export default ProductCategory;
