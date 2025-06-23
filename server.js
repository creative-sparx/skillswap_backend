import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

// Import routes
import testRoutes from "./routes/testRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import swapRoutes from "./routes/swapRoutes.js"; // Import swap routes
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import gamificationRoutes from "./routes/gamificationRoutes.js";
import tutorUploadRoutes from "./routes/tutorUploadRoutes.js";
import communityForumRoutes from "./routes/communityForumRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import userRoutes from "./routes/userRoutes.js"; // Import user routes
import aiRoutes from "./routes/aiRoutes.js"; // Import AI routes

dotenv.config();

import http from "http";
import { Server as SocketIOServer } from "socket.io";
import rateLimit from "express-rate-limit";
import morgan from "morgan";

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  }
});

// Socket.io events
io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);

  // Join personal room for direct messages/notifications
  socket.on("join", (userId) => {
    socket.join(userId);
  });

  // Join group chat room (e.g., for course Q&A or skill exchange)
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
  });

  // Leave group chat room
  socket.on("leave_room", (roomId) => {
    socket.leave(roomId);
  });

  // 1:1 or group chat message
  socket.on("send_message", (data) => {
    // data: { to, from, content, roomId, isGroup }
    if (data.isGroup && data.roomId) {
      io.to(data.roomId).emit("receive_message", data);
    } else {
      io.to(data.to).emit("receive_message", data);
    }
  });

  // Typing indicator
  socket.on("typing", (data) => {
    // data: { roomId, userId }
    // Broadcast to everyone in the room except the sender
    socket.to(data.roomId).emit("receive_typing", { userId: data.userId, isTyping: true });
  });

  socket.on("stop_typing", (data) => {
    // data: { roomId, userId }
    // Broadcast to everyone in the room except the sender
    socket.to(data.roomId).emit("receive_stop_typing", { userId: data.userId, isTyping: false });
  });

  // Real-time notifications
  socket.on("send_notification", (data) => {
    // data: { to, type, content, meta }
    io.to(data.to).emit("receive_notification", data);
    // Fallback: trigger email if user is offline (pseudo-code)
    // if (!isUserOnline(data.to)) sendEmailNotification(data);
  });

  // Special events
  socket.on("course_enrollment", (data) => {
    // data: { userId, courseId, ... }
    io.to(data.userId).emit("enrollment_notification", data);
  });

  socket.on("exchange_status", (data) => {
    // data: { userId, status, exchangeId }
    io.to(data.userId).emit("exchange_status_notification", data);
  });

  socket.on("admin_announcement", (data) => {
    // data: { message }
    io.emit("admin_announcement", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// Middleware
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000", // Restrict to frontend URL in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
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
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Routes
app.get("/", (req, res) => {
  res.json({ 
    message: "🎓 SkillSwap API Server is running!",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      test: "/api/test"
    }
  });
});

app.use("/api/test", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/api/tutor-upload", tutorUploadRoutes);
app.use("/api/community-forum", communityForumRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes); // Mount user routes
app.use("/api/swaps", swapRoutes); // Mount swap routes
app.use("/api/ai", aiRoutes); // Use AI routes

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: "Something went wrong!",
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: "Route not found" 
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 SkillSwap Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Socket.io enabled on port ${PORT}`);
});

export { io };
