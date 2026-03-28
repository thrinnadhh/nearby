// 1. Load environment variables first
import 'dotenv/config';

// 2. Core imports
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import logger from './utils/logger.js';

// Route imports
import authRouter     from './routes/auth.js';
import shopsRouter    from './routes/shops.js';
import productsRouter from './routes/products.js';
import ordersRouter   from './routes/orders.js';
import deliveryRouter from './routes/delivery.js';
import paymentsRouter from './routes/payments.js';
import reviewsRouter  from './routes/reviews.js';
import searchRouter   from './routes/search.js';
import adminRouter    from './routes/admin.js';

// Middleware imports
import errorHandler from './middleware/errorHandler.js';

// Socket handler imports
import { registerOrderRoom }  from './socket/orderRoom.js';
import { registerGpsTracker } from './socket/gpsTracker.js';
import { registerChat }       from './socket/chat.js';

const PORT = process.env.PORT || 3000;

// 3. Create Express app and attach global middleware
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// 5. Mount all route files under /api/v1/
app.use('/api/v1/auth',     authRouter);
app.use('/api/v1/shops',    shopsRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/orders',   ordersRouter);
app.use('/api/v1/delivery', deliveryRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/reviews',  reviewsRouter);
app.use('/api/v1/search',   searchRouter);
app.use('/api/v1/admin',    adminRouter);

// 6. Global error handler — must be last middleware
app.use(errorHandler);

// 7. Create HTTP server
const httpServer = createServer(app);

// 8. Attach Socket.IO
const io = new SocketIO(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  logger.info({ event: 'socket:connected', socketId: socket.id });

  registerOrderRoom(io, socket);
  registerGpsTracker(io, socket);
  registerChat(io, socket);

  socket.on('disconnect', () => {
    logger.info({ event: 'socket:disconnected', socketId: socket.id });
  });
});

// 9 & 10. Start server
httpServer.listen(PORT, () => {
  logger.info(`NearBy API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  logger.info(`Health: http://localhost:${PORT}/health`);
});

export { app, io };
