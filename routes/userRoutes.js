import express from 'express';
import { addFCMToken } from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js'; // Corrected import name to match export

const router = express.Router();

// Use only one authentication middleware for /fcm-token
router.post('/fcm-token', protect, addFCMToken);

export default router;