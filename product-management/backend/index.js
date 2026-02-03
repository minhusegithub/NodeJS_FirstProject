// Import dependencies
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cookieParser from 'cookie-parser';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Import configurations
import * as database from './config/database.js';
import corsMiddleware from './middlewares/cors.middleware.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';

// Import routes
import apiV1Routes from './routes/api/v1/index.js';

// Configure dotenv
dotenv.config();

// ES6 __dirname alternative
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connect to database
database.connect();

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
server.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`📡 API available at http://localhost:${port}/api/v1`);
  console.log(`🔗 Health check at http://localhost:${port}/health`);
});

export default app;
