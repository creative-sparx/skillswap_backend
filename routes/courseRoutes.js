import express from 'express';
import {
  getCourses,
  getCourse,
  enrollInCourse,
  getMyEnrollments,
  getMyCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseAnalytics
} from '../controllers/courseController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateCourseCreation, validateCourseUpdate } from '../middleware/validation.js';

const router = express.Router();

// Public routes
router.get('/', getCourses);
router.get('/:id', getCourse);

// Protected routes
router.use(protect); // All routes below require authentication

// User course management
router.get('/my/enrollments', getMyEnrollments);
router.get('/my/courses', getMyCourses);
router.post('/:id/enroll', enrollInCourse);

// Course CRUD operations
router.post('/', validateCourseCreation, createCourse);
router.put('/:id', validateCourseUpdate, updateCourse);
router.delete('/:id', deleteCourse);

// Analytics
router.get('/:id/analytics', getCourseAnalytics);

export default router;
