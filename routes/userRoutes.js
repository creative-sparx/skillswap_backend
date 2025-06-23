import express from 'express';
import { addFCMToken } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js'; // Assuming this middleware exists

const router = express.Router();

router.post('/fcm-token', protect, addFCMToken);

export default router;