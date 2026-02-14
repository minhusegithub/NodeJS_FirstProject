import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';
import slugify from 'slugify';

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    sku: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        comment: 'Stock Keeping Unit - unique product code'
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    product_category_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Reference to category id'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Base price in VND'
    },
    discount_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Discount percentage (0-100)'
    },
    stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
            min: 0
        },
        comment: 'Stock quantity in the main warehouse'
    },
    brand: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Product brand/manufacturer'
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
    featured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },

    is_variant_parent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'True if this product has variants (color/size/etc)'
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
    tableName: 'products',
    timestamps: true,
    underscored: true,
    paranoid: true, // Soft delete
    hooks: {
        beforeValidate: (product) => {
            if (product.title && !product.slug) {
                product.slug = slugify(product.title, { lower: true, strict: true });
            }
        },
        beforeCreate: async (product) => {
            if (product.slug) {
                const count = await sequelize.models.Product.count({
                    where: { slug: product.slug },
                    paranoid: false
                });
                if (count > 0) {
                    product.slug = `${product.slug}-${Date.now()}`;
                }
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
            fields: ['featured']
        }
    ]
});

export default Product;
