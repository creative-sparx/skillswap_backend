import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { addXP, unlockBadge, getLeaderboard } from '../controllers/gamificationController.js';
import { body, query } from 'express-validator';

const router = express.Router();

// Add XP points (protected)
router.post('/xp', protect, [
  body('userId').isMongoId(),
  body('points').isNumeric(),
  body('reason').optional().isString()
], addXP);

// Unlock badge (protected)
router.post('/badge', protect, [
  body('userId').isMongoId(),
  body('name').isString(),
  body('description').optional().isString(),
  body('icon').optional().isString()
], unlockBadge);

// Get leaderboard (public)
router.get('/leaderboard', [
  query('limit').optional().isNumeric()
], getLeaderboard);

export default router;
