import { Sequelize } from 'sequelize';

// PostgreSQL Database configuration
const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DATABASE || 'product_management',
    username: process.env.PG_USER || 'postgres',
    password: 'minhmysql1@',

    // Connection pool configuration
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },

    // Logging
    logging: process.env.NODE_ENV === 'development' ? console.log : false,

    // Timezone
    timezone: '+07:00',

    // Define options
    define: {
        timestamps: true,
        underscored: true, // Use snake_case for column names
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

// Test connection
export const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL connection established successfully.');
        return true;
    } catch (error) {
        console.error('❌ Unable to connect to PostgreSQL:', error.message);
        return false;
    }
};

// Sync models (use carefully, prefer migrations in production)
export const syncDatabase = async (options = {}) => {
    try {
        await sequelize.sync(options);
        console.log('✅ Database synchronized successfully.');
    } catch (error) {
        console.error('❌ Database sync failed:', error.message);
        throw error;
    }
};

export default sequelize;
