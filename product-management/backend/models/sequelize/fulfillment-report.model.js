import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.sequelize.js';

const FulfillmentReport = sequelize.define('FulfillmentReport', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    store_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    report_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Ngay chot so lieu'
    },
    total_orders: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    avg_lead_time_mins: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'T1: Nhan don -> Xac nhan'
    },
    avg_fulfillment_time_mins: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'T2: Xac nhan -> Giao shipper'
    },
    avg_delivery_time_mins: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'T3: Giao shipper -> Toi tay khach'
    },
    sla_target_mins: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Muc SLA tai thoi diem chot bao cao'
    },
    sla_compliant_orders: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    sla_compliance_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        comment: '% Dat chi tieu SLA'
    },
    bottleneck_stage: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: {
            isIn: [['LEAD_TIME', 'FULFILLMENT', 'DELIVERY', 'OPTIMAL']]
        }
    },
    calculated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'fulfillment_reports',
    timestamps: true,
    underscored: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at',
    indexes: [
        {
            unique: true,
            fields: ['store_id', 'report_date']
        },
        {
            fields: ['report_date']
        },
        {
            fields: ['bottleneck_stage']
        },
        {
            fields: ['calculated_at']
        }
    ]
});

export default FulfillmentReport;
