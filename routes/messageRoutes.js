import express from 'express';
import { body } from 'express-validator';
import {
  createMessage,
  getAllMessages,
  getMessageById,
  updateMessage,
  deleteMessage
} from '../controllers/messageController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Protected: Get all messages (optionally filter by sender/receiver)
router.get('/', protect, getAllMessages);

// Protected: Get message by ID
router.get('/:id', protect, getMessageById);

// Protected: Create message
router.post(
  '/',
  protect,
  [
    body('sender').isMongoId(),
    body('receiver').isMongoId(),
    body('content').isString().isLength({ min: 1, max: 2000 })
  ],
  createMessage
);

// Protected: Update message (e.g., mark as read)
router.put(
  '/:id',
  protect,
  [
    body('read').optional().isBoolean(),
    body('content').optional().isString().isLength({ min: 1, max: 2000 })
  ],
  updateMessage
);

// Protected: Delete message
router.delete('/:id', protect, deleteMessage);

export default router;
