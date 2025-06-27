import express from 'express';

const router = express.Router();

// GET /api/test - Simple test endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SkillSwap API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// GET /api/test/health - Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// GET /api/test/db - Database connection test
router.get('/db', async (req, res) => {
  try {
    // Simple database connection test
    const mongoose = await import('mongoose');
    const isConnected = mongoose.default.connection.readyState === 1;
    
    res.json({
      success: true,
      database: {
        connected: isConnected,
        state: mongoose.default.connection.readyState,
        host: mongoose.default.connection.host,
        name: mongoose.default.connection.name
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
