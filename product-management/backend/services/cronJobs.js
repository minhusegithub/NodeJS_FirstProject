import { startRevenueAggregator } from './revenueAggregator.js';
import { startDSIAggregator } from './dsiReport.service.js';
import { startMomentumAggregator } from './momentumReport.service.js';
import { startFulfillmentAggregator } from './fulfillmentReport.service.js';

export const startAllCronJobs = () => {
    startRevenueAggregator();
    startDSIAggregator();
    startMomentumAggregator();
    startFulfillmentAggregator();

    console.log('⏱️  All cron jobs started');
};
