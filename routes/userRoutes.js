import express from 'express';
import { addFCMToken } from '../controllers/userController.js';
import { authenticate } from '../middlewares/authMiddleware.js'; // Corrected path and import name

const router = express.Router();

router.post('/fcm-token', authenticate, addFCMToken); // Use authenticate middleware

export default router;