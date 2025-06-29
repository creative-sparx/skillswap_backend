import express from 'express';
import { body, param, query } from 'express-validator';
import {
  getFeaturedItems,
  getFeaturedItem,
  trackFeaturedClick,
  getAllFeaturedItems,
  createFeaturedItem,
  updateFeaturedItem,
  deleteFeaturedItem,
  toggleFeaturedStatus,
  getFeaturedAnalytics
} from '../controllers/featuredController.js';
import auth from '../middleware/auth.js';
import adminMiddleware from '../middleware/admin.js';

const router = express.Router();

// Validation rules
const createFeaturedValidation = [
  body('itemId')
    .notEmpty()
    .withMessage('Item ID is required')
    .isMongoId()
    .withMessage('Invalid item ID format'),
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('bannerImage')
    .optional()
    .isURL()
    .withMessage('Banner image must be a valid URL'),
  body('priority')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Priority must be between 0 and 100'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((endDate, { req }) => {
      const startDate = req.body.startDate || new Date();
      if (new Date(endDate) <= new Date(startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .withMessage('Each tag must be a string'),
  body('targetAudience')
    .optional()
    .isIn(['all', 'beginners', 'intermediate', 'advanced'])
    .withMessage('Target audience must be one of: all, beginners, intermediate, advanced')
];

const updateFeaturedValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid featured item ID'),
  body('title')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('bannerImage')
    .optional()
    .isURL()
    .withMessage('Banner image must be a valid URL'),
  body('priority')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Priority must be between 0 and 100'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  body('targetAudience')
    .optional()
    .isIn(['all', 'beginners', 'intermediate', 'advanced'])
    .withMessage('Target audience must be one of: all, beginners, intermediate, advanced')
];

const mongoIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format')
];

const getFeaturedValidation = [
  query('type')
    .optional()
    .isIn(['tutor', 'course'])
    .withMessage('Type must be either "tutor" or "course"'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('targetAudience')
    .optional()
    .isIn(['all', 'beginners', 'intermediate', 'advanced'])
    .withMessage('Target audience must be one of: all, beginners, intermediate, advanced')
];

const adminGetFeaturedValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['tutor', 'course'])
    .withMessage('Type must be either "tutor" or "course"'),
  query('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either "active" or "inactive"')
];

// Public routes
// GET /api/featured - Get all active featured items
router.get('/', getFeaturedValidation, getFeaturedItems);

// GET /api/featured/:id - Get specific featured item
router.get('/:id', mongoIdValidation, getFeaturedItem);

// POST /api/featured/:id/click - Track click on featured item
router.post('/:id/click', mongoIdValidation, trackFeaturedClick);

// Admin routes (require authentication and admin privileges)
// GET /api/featured/admin/all - Get all featured items (including inactive)
router.get('/admin/all', auth, adminMiddleware, adminGetFeaturedValidation, getAllFeaturedItems);

// POST /api/featured/admin - Create new featured item
router.post('/admin', auth, adminMiddleware, createFeaturedValidation, createFeaturedItem);

// PUT /api/featured/admin/:id - Update featured item
router.put('/admin/:id', auth, adminMiddleware, updateFeaturedValidation, updateFeaturedItem);

// DELETE /api/featured/admin/:id - Delete featured item
router.delete('/admin/:id', auth, adminMiddleware, mongoIdValidation, deleteFeaturedItem);

// PATCH /api/featured/admin/:id/toggle - Toggle featured item status
router.patch('/admin/:id/toggle', auth, adminMiddleware, mongoIdValidation, toggleFeaturedStatus);

// GET /api/featured/admin/:id/analytics - Get featured item analytics
router.get('/admin/:id/analytics', auth, adminMiddleware, mongoIdValidation, getFeaturedAnalytics);

export default router;
