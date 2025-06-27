import express from 'express';
import { chatWithAi } from '../controllers/aiController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/chat', protect, chatWithAi); // Use protect middleware

export default router;
