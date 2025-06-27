import express from 'express';
import { body } from 'express-validator';
import {
  sendMessage,
  getMessagesForSwap,
  markMessagesAsRead
} from '../controllers/messageController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Protected: Send a message within a swap
// POST /api/messages/swap/:swapId
router.post(
  '/swap/:swapId',
  protect,
  [
    body('content').isString().isLength({ min: 1, max: 1000 }),
    body('repliedToMessageId').optional().isMongoId()
  ],
  sendMessage
);

// Protected: Get all messages for a specific swap
// GET /api/messages/swap/:swapId
router.get('/swap/:swapId', protect, getMessagesForSwap);

// Protected: Mark messages as read for a swap
// PUT /api/messages/swap/:swapId/read
router.put('/swap/:swapId/read', protect, markMessagesAsRead);

export default router;
