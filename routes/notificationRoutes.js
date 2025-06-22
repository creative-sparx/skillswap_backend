import express from 'express';
import { body } from 'express-validator';
import {
  createNotification,
  getAllNotifications,
  getNotificationById,
  updateNotification,
  deleteNotification
} from '../controllers/notificationController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Protected: Get all notifications (optionally filter by recipient/type)
router.get('/', authenticate, getAllNotifications);

// Protected: Get notification by ID
router.get('/:id', authenticate, getNotificationById);

// Protected: Create notification
router.post(
  '/',
  authenticate,
  [
    body('recipient').isMongoId(),
    body('type').isIn(['message', 'forum', 'exchange', 'system']),
    body('content').isString().isLength({ min: 1, max: 1000 })
  ],
  createNotification
);

// Protected: Update notification (e.g., mark as read)
router.put(
  '/:id',
  authenticate,
  [
    body('read').optional().isBoolean(),
    body('content').optional().isString().isLength({ min: 1, max: 1000 })
  ],
  updateNotification
);

// Protected: Delete notification
router.delete('/:id', authenticate, deleteNotification);

export default router;
