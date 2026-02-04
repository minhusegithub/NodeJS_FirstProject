import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';
import slugify from 'slugify';

const ProductVariant = sequelize.define('ProductVariant', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        },
        comment: 'Parent product ID'
    },
    sku: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Unique SKU for this variant'
    },
    variant_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Variant display name (e.g., "Red - Size M")'
    },
    variant_attributes: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'Variant attributes as JSON: {color: "red", size: "M"}'
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Variant-specific price (overrides parent product price if set)'
    },
    thumbnail: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Variant-specific image'
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'active',
        validate: {
            isIn: [['active', 'inactive']]
        }
    },
    position: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Display order'
    },
    slug: {
        type: DataTypes.STRING(255),
        unique: true
    }
}, {
    tableName: 'product_variants',
    timestamps: true,
    underscored: true,
    paranoid: true,
    hooks: {
        beforeValidate: (variant) => {
            if (variant.variant_name && !variant.slug) {
                variant.slug = slugify(variant.variant_name, { lower: true, strict: true });
            }
        }
    },
    indexes: [
        {
            unique: true,
            fields: ['sku']
        },
        {
            fields: ['product_id']
        },
        {
            fields: ['status']
        }
    ]
});

export default ProductVariant;
