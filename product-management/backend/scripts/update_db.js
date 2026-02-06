import { sequelize } from '../models/sequelize/index.js';

const run = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Alter column role_id to be nullable
        await sequelize.query('ALTER TABLE store_staff ALTER COLUMN role_id DROP NOT NULL;');

        console.log('Successfully updated store_staff table.');
    } catch (error) {
        console.error('Unable to connect to the database or run query:', error);
    } finally {
        await sequelize.close();
    }
};

run();
