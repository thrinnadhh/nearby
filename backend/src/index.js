import 'dotenv/config';

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import logger from './utils/logger.js';
import { successResponse } from './utils/response.js';
import { verifyToken } from './middleware/auth.js';

// Service imports
import { redis } from './services/redis.js';
import { supabase } from './services/supabase.js';
import { typesense } from './services/typesense.js';

// Route imports
import authRouter from './routes/auth.js';
import shopsRouter from './routes/shops.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import deliveryRouter from './routes/delivery.js';
import paymentsRouter from './routes/payments.js';
import reviewsRouter from './routes/reviews.js';
import searchRouter from './routes/search.js';
import adminRouter from './routes/admin.js';

// Middleware imports
import errorHandler from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimit.js';

// Socket handler imports
import { registerOrderRoom } from './socket/orderRoom.js';
import { registerGpsTracker } from './socket/gpsTracker.js';
import { registerChat } from './socket/chat.js';

// Validate required environment variables at startup
const requiredEnvVars = [
  'JWT_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'REDIS_URL',
  'MSG91_AUTH_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Parse allowed Socket.IO origins from env
const allowedOrigins = process.env.SOCKET_ALLOWED_ORIGINS
  ? process.env.SOCKET_ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];

// 1. Create Express app
const app = express();

// 2. Add request ID for logging
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    requestId: req.id,
  });
  next();
});

// 3. Security and parsing middleware
app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Apply global rate limiting
app.use(globalLimiter);

// 5. Health check endpoint
app.get('/health', (req, res) => {
  res.json(successResponse({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: NODE_ENV,
  }));
});

// 6. Readiness probe endpoint
app.get('/readiness', async (req, res) => {
  const checks = {};

  // Check Redis
  try {
    await redis.ping();
    checks.redis = { status: 'ready' };
  } catch (err) {
    checks.redis = { status: 'unavailable', error: err.message };
  }

  // Check Supabase
  try {
    const { error } = await supabase.auth.getSession();
    checks.supabase = { status: error ? 'unavailable' : 'ready' };
  } catch (err) {
    checks.supabase = { status: 'unavailable', error: err.message };
  }

  // Check Typesense
  try {
    await typesense.collections.retrieve();
    checks.typesense = { status: 'ready' };
  } catch (err) {
    checks.typesense = { status: 'unavailable', error: err.message };
  }

  const allReady = Object.values(checks).every(c => c.status === 'ready');
  const statusCode = allReady ? 200 : 503;

  res.status(statusCode).json(successResponse({
    readiness: allReady,
    timestamp: new Date().toISOString(),
    checks,
  }));
});

// 7. Mount all route files under /api/v1/
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/shops', shopsRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/delivery', deliveryRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/admin', adminRouter);

// 8. 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} not found`,
    },
  });
});

// 9. Global error handler — must be last middleware
app.use(errorHandler);

// 10. Create HTTP server
const httpServer = createServer(app);

// 11. Attach Socket.IO with security middleware
const io = new SocketIO(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Authorization']
  },
  transports: ['websocket', 'polling'],
});

// Socket.IO authentication middleware — verifies JWT before connection
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token
      || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      logger.warn('Socket.IO connection rejected: no token', {
        socketId: socket.id,
        clientIp: socket.handshake.address
      });
      return next(new Error('UNAUTHORIZED'));
    }

    const decoded = verifyToken(token);

    socket.userId = decoded.userId;
    socket.phone = decoded.phone;
    socket.role = decoded.role;
    socket.shopId = decoded.shopId || null;

    logger.debug('Socket authenticated', {
      socketId: socket.id,
      userId: socket.userId,
      role: socket.role
    });
    next();
  } catch (err) {
    logger.warn('Socket.IO authentication failed', {
      socketId: socket.id,
      error: err.message
    });
    next(new Error('INVALID_TOKEN'));
  }
});

// Connection handler for authenticated clients
io.on('connection', (socket) => {
  logger.info('Socket.IO client connected', {
    socketId: socket.id,
    userId: socket.userId,
    role: socket.role,
    clientIp: socket.handshake.address,
  });

  registerOrderRoom(io, socket);
  registerGpsTracker(io, socket);
  registerChat(io, socket);

  socket.on('disconnect', () => {
    logger.debug('Socket.IO client disconnected', {
      socketId: socket.id,
      userId: socket.userId
    });
  });

  socket.on('error', (err) => {
    logger.error('Socket.IO error', {
      socketId: socket.id,
      userId: socket.userId,
      error: err.message,
    });
  });
});

// 12. Start server
const server = httpServer.listen(PORT, () => {
  logger.info(`NearBy API started on port ${PORT}`, {
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
  logger.info('Health check: GET /health');
  logger.info('Readiness probe: GET /readiness');
});

// 13. Graceful shutdown
process.on('SIGTERM', () => {
  logger.warn('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    redis.disconnect();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.warn('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    redis.disconnect();
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

export { app, io };
