import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
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
router.get('/users', authenticate, requireAdmin, getAllUsers);
router.put('/users/:id/ban', authenticate, requireAdmin, banUser);
router.put('/users/:id/unban', authenticate, requireAdmin, unbanUser);
router.put('/users/:id/promote', authenticate, requireAdmin, [body('role').isIn(['admin','moderator','tutor','student'])], promoteUser);

// Course approval
router.put('/courses/:id/approve', authenticate, requireAdmin, approveCourse);
router.put('/courses/:id/reject', authenticate, requireAdmin, rejectCourse);

// Pending content
router.get('/courses/pending', authenticate, requireAdmin, getPendingCourses);

// Flagged Content
router.get('/forums/flagged', authenticate, requireAdmin, getFlaggedPosts);

// Skill exchange approval
router.put('/exchanges/:id/approve', authenticate, requireAdmin, approveSkillExchange);
router.put('/exchanges/:id/reject', authenticate, requireAdmin, rejectSkillExchange);

// Forum post approval
router.put('/forums/:id/approve', authenticate, requireAdmin, approveForumPost);
router.put('/forums/:id/reject', authenticate, requireAdmin, rejectForumPost);

// Stats & flagged content
router.get('/stats', authenticate, requireAdmin, getStats);

export default router;
