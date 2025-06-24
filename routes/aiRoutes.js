import express from 'express';
import { chatWithAi } from '../controllers/aiController.js';
import { authenticate } from '../middlewares/authMiddleware.js'; // Corrected path and import name

const router = express.Router();

router.post('/chat', authenticate, chatWithAi); // Use authenticate middleware

export default router;