// Load environment variables FIRST (before any other imports that need them)
import './config/env.js';

// Import dependencies
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cookieParser from 'cookie-parser';
import http from 'http';
import { Server } from 'socket.io';

// Import configurations
import corsMiddleware from './middlewares/cors.middleware.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';

// Import routes
import apiV1Routes from './routes/api/v1/index.js';

// ES6 __dirname alternative
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



// Connect PostgreSQL
import { sequelize } from './models/sequelize/index.js';
import { startRevenueAggregator } from './services/revenueAggregator.js';
import { startDSIAggregator } from './services/dsiReport.service.js';
import { startMomentumAggregator } from './services/momentumReport.service.js';
import { startFulfillmentAggregator } from './services/fulfillmentReport.service.js';
sequelize.authenticate()
  .then(async () => {
    console.log('✅ PostgreSQL connected successfully');
    
    // Auto-sync database in development (creates tables if not exists)
    if (process.env.NODE_ENV === 'development') {
      try {
        await sequelize.sync({ alter: false });
        console.log('✅ Database tables synchronized');
      } catch (syncError) {
        console.error('⚠️ Database sync warning:', syncError.message);
      }
    }

    // Start revenue aggregation cron jobs
    startRevenueAggregator();
    startDSIAggregator();
    startMomentumAggregator();
    startFulfillmentAggregator();
  })
  .catch(err => console.error('❌ PostgreSQL connection failed:', err));

// Connect Redis (graceful — server vẫn chạy nếu Redis không có)
import getRedisClient from './config/redis.js';
getRedisClient(); // Khởi tạo client + bắt đầu kết nối

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// CORS middleware (must be before routes)
app.use(corsMiddleware);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser middleware
app.use(cookieParser());

// Socket.io setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }
});
global._io = io;

// Static files (for uploaded images, etc.)
app.use('/uploads', express.static(`${__dirname}/public/uploads`));

// API Routes
app.use('/api/v1', apiV1Routes);



// 404 handler
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
server.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`📡 API available at http://localhost:${port}/api/v1`);

});

export default app;
