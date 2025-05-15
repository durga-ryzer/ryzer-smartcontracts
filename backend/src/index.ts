import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Server } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

import { getDatabase, closeDatabase } from './config/database';
import { logger } from './utils/logger';
import { errorHandler } from './middlewares/errorHandler';
import { apiRouter } from './api';
import { ServiceManager, ServiceManagerConfig } from './services';
import { setupWebSocketHandlers } from './api/websocket';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server
const server = createServer(app);

// Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible globally
declare global {
  var io: Server;
}
global.io = io;

// Set up WebSocket handlers
setupWebSocketHandlers(io);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ryzer Wallet API',
      version: '1.0.0',
      description: 'API documentation for Ryzer Wallet backend services',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/api/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Serve swagger docs
app.use('/api-docs', ...swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec));

// API routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: Date.now(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Error handling middleware
app.use(errorHandler as ErrorRequestHandler);

// Serve static files from the frontend build directory in production
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../../frontend/build');
  app.use(express.static(frontendBuildPath));
  
  // For any request that doesn't match an API route, serve the React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// Initialize services
const serviceConfig: ServiceManagerConfig = {
  blockchainProviderUrl: process.env.BLOCKCHAIN_PROVIDER_URL || '',
  databaseConfig: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'ryzer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY || '',
  socketServer: io,
};

const serviceManager = new ServiceManager(serviceConfig);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await getDatabase();
    
    // Initialize all services
    await serviceManager.initializeServices();
    
    // Start HTTP server
    server.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      logger.info(`API documentation available at http://localhost:${port}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};


// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', reason);
});

// Start the server
startServer();
