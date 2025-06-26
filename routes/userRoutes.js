import express from 'express';
import { addFCMToken } from '../controllers/userController.js';
import { authenticate } from '../middlewares/authMiddleware.js'; // Corrected import name

const router = express.Router();

// Use only one authentication middleware for /fcm-token
router.post('/fcm-token', authenticate, addFCMToken);

export default router;