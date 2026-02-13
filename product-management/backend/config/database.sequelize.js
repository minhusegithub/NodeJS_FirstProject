// Load environment variables
import './env.js';

import { Sequelize } from 'sequelize';

// Validate required environment variables
const requiredEnvVars = ['PG_HOST', 'PG_DATABASE', 'PG_USER', 'PG_PASSWORD'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
    console.error('Please check your .env file and ensure all required variables are set.');
    throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
}

// PostgreSQL Database configuration
const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT) || 5432,
    database: process.env.PG_DATABASE,
    username: process.env.PG_USER,
    password: process.env.PG_PASSWORD,

    // Connection pool configuration
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },

    // Logging
    logging: false, // Set to console.log to see SQL queries

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
        console.log(`📊 Connected to database: ${process.env.PG_DATABASE} at ${process.env.PG_HOST}:${process.env.PG_PORT || 5432}`);
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
