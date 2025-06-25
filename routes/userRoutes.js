import express from 'express';
import { addFCMToken } from '../controllers/userController.js';
import { authenticate } from '../middlewares/authMiddleware.js'; // Corrected path and import name

const router = express.Router();

// Use only one authentication middleware for /fcm-token
router.post('/fcm-token', authenticate, addFCMToken);
// If you want to support both, you can add another route with a different path or method
// router.post('/fcm-token-alt', protect, addFCMToken);

export default router;