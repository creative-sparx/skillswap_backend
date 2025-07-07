import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

// Initialize Firebase Admin SDK
import './config/firebase.js';

// Import routes
import userRoutes from './routes/userRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import swapRoutes from './routes/swapRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import gamificationRoutes from './routes/gamificationRoutes.js';
import tutorUploadRoutes from './routes/tutorUploadRoutes.js';
import communityForumRoutes from './routes/communityForumRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import authRoutes from './routes/authRoutes.js';
import testRoutes from './routes/testRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import subscriptionPlanRoutes from './routes/subscriptionPlanRoutes.js';
import featuredRoutes from './routes/featured.js';



import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import logger from './config/logger.js';

dotenv.config();

// Import services for cron job initialization
import * as subscriptionService from './services/subscriptionService.js';
import CronService from './services/cronService.js';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  }
});

// Socket.io events
io.on('connection', (socket) => {
  logger.info(`🔌 New client connected: ${socket.id}`);

  // Join personal room for direct messages/notifications
  socket.on('join', (userId) => {
    socket.join(userId);
  });

  // Join group chat room (e.g., for course Q&A or skill exchange)
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
  });

  // Leave group chat room
  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
  });

  // 1:1 or group chat message
  socket.on('send_message', (data) => {
    // data: { to, from, content, roomId, isGroup }
    if (data.isGroup && data.roomId) {
      io.to(data.roomId).emit('receive_message', data);
    } else {
      io.to(data.to).emit('receive_message', data);
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    // data: { roomId, userId }
    // Broadcast to everyone in the room except the sender
    socket.to(data.roomId).emit('receive_typing', { userId: data.userId });
  });

  socket.on('stop_typing', (data) => {
    // data: { roomId, userId }
    // Broadcast to everyone in the room except the sender
    socket.to(data.roomId).emit('receive_stop_typing', { userId: data.userId, isTyping: false });
  });

  // Real-time notifications
  socket.on('send_notification', (data) => {
    // data: { to, type, content, meta }
    io.to(data.to).emit('receive_notification', data);
    // Fallback: trigger email if user is offline (pseudo-code)
    // if (!isUserOnline(data.to)) sendEmailNotification(data);
  });

  // Special events
  socket.on('course_enrollment', (data) => {
    // data: { userId, courseId, ... }
    io.to(data.userId).emit('enrollment_notification', data);
  });

  socket.on('exchange_status', (data) => {
    // data: { userId, status, exchangeId }
    io.to(data.userId).emit('exchange_status_notification', data);
  });

  socket.on('admin_announcement', (data) => {
    // data: { message }
    io.emit('admin_announcement', data);
  });

  socket.on('disconnect', () => {
    logger.info(`❌ Client disconnected: ${socket.id}`);
  });
});

// Middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? process.env.CORS_ORIGIN : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true
};

app.use(cors(corsOptions));
// Capture raw body for webhook signature verification
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(morgan('combined'));

// Rate limiting (100 requests per 15 min per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.'
});
app.use(limiter);

// Connect to MongoDB

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    logger.info('✅ MongoDB Connected Successfully');
    // Initialize comprehensive cron jobs after DB connection
    try {
      CronService.init();
      logger.info('⏰ CronService initialized with all job types.');
    } catch (error) {
      logger.error('❌ Failed to initialize CronService:', error);
    }
  })
  .catch((err) => logger.error('❌ MongoDB Connection Error:', err));

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: '🎓 SkillSwap API Server is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      test: '/api/test',
      subscriptions: '/api/subscriptions',
      featured: '/api/featured',
      profiles: '/api/profiles'
    }
  });
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Helper function to safely mount routes
const safelyMountRoute = (path, router, name) => {
  try {
    app.use(path, router);
    logger.info(`✅ Mounted ${name} routes at ${path}`);
  } catch (error) {
    logger.error(`❌ Failed to mount ${name} routes at ${path}: ${error.message}`);
  }
};

// Mount routes with error handling - temporarily disable some to isolate issue
safelyMountRoute('/api/test', testRoutes, 'test');
safelyMountRoute('/api/auth', authRoutes, 'auth');
safelyMountRoute('/api/subscriptions', subscriptionRoutes, 'subscription');
safelyMountRoute('/api/subscription-plans', subscriptionPlanRoutes, 'subscription-plans');
safelyMountRoute('/api/certificates', certificateRoutes, 'certificate');
safelyMountRoute('/api/subscriptions', subscriptionRoutes, 'subscription');
safelyMountRoute('/api/featured', featuredRoutes, 'featured');
safelyMountRoute('/api/profiles', profileRoutes, 'profile');
safelyMountRoute('/api/notifications', notificationRoutes, 'notification');
safelyMountRoute('/api/upload', uploadRoutes, 'upload');
safelyMountRoute('/api/payments', paymentRoutes, 'payment');
safelyMountRoute('/api/admin', adminRoutes, 'admin');
safelyMountRoute('/api/search', searchRoutes, 'search');
safelyMountRoute('/api/gamification', gamificationRoutes, 'gamification');
safelyMountRoute('/api/tutor-upload', tutorUploadRoutes, 'tutor-upload');
safelyMountRoute('/api/community-forum', communityForumRoutes, 'community-forum');
safelyMountRoute('/api/messages', messageRoutes, 'message');
safelyMountRoute('/api/users', userRoutes, 'user');
safelyMountRoute('/api/swaps', swapRoutes, 'swap');
safelyMountRoute('/api/ai', aiRoutes, 'ai');
safelyMountRoute('/api/wallet', walletRoutes, 'wallet');
safelyMountRoute('/api/courses', courseRoutes, 'course');
// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  logger.info(`🚀 SkillSwap Server running on ${HOST}:${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔌 Socket.io enabled on port ${PORT}`);
});

export { io };
export default app;
