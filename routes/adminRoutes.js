import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/adminMiddleware.js';
import {
  getAllUsers, banUser, unbanUser, promoteUser,
  approveCourse, rejectCourse, getPendingCourses,
  approveSkillExchange, rejectSkillExchange,
  approveForumPost, rejectForumPost,
  getStats,
  getFlaggedPosts
} from '../controllers/adminController.js';
import { body } from 'express-validator';

const router = express.Router();

// User management
router.get('/users', protect, requireAdmin, getAllUsers);
router.put('/users/:id/ban', protect, requireAdmin, banUser);
router.put('/users/:id/unban', protect, requireAdmin, unbanUser);
router.put('/users/:id/promote', protect, requireAdmin, [body('role').isIn(['admin','moderator','tutor','student'])], promoteUser);

// Course approval
router.put('/courses/:id/approve', protect, requireAdmin, approveCourse);
router.put('/courses/:id/reject', protect, requireAdmin, rejectCourse);

// Pending content
router.get('/courses/pending', protect, requireAdmin, getPendingCourses);

// Flagged Content
router.get('/forums/flagged', protect, requireAdmin, getFlaggedPosts);

// Skill exchange approval
router.put('/exchanges/:id/approve', protect, requireAdmin, approveSkillExchange);
router.put('/exchanges/:id/reject', protect, requireAdmin, rejectSkillExchange);

// Forum post approval
router.put('/forums/:id/approve', protect, requireAdmin, approveForumPost);
router.put('/forums/:id/reject', protect, requireAdmin, rejectForumPost);

// Stats & flagged content
router.get('/stats', protect, requireAdmin, getStats);

export default router;
