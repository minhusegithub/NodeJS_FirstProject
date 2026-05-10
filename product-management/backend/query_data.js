import sequelize from './config/database.sequelize.js';
import { QueryTypes } from 'sequelize';
import ProductStoreInventory from './models/sequelize/product-store-inventory.model.js';
import DsiReport from './models/sequelize/dsi-report.model.js';

async function run() {
    try {
        await sequelize.authenticate();
        console.log('--- DSI Reports ---');
        const dsi = await DsiReport.findAll({ limit: 10, raw: true });
        console.log(dsi);

        console.log('\n--- Product Store Inventory ---');
        const inv = await ProductStoreInventory.findAll({ limit: 10, raw: true });
        console.log(inv);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
