import express from 'express';
import { searchCourses, searchTutors, searchForums, autocomplete } from '../controllers/searchController.js';
import { query } from 'express-validator';

const router = express.Router();

// Search courses
router.get('/courses', [
  query('q').optional().isString(),
  query('category').optional().isString(),
  query('minPrice').optional().isNumeric(),
  query('maxPrice').optional().isNumeric(),
  query('level').optional().isString(),
  query('minRating').optional().isNumeric(),
  query('tags').optional().isString()
], searchCourses);

// Search tutors
router.get('/tutors', [
  query('q').optional().isString(),
  query('skills').optional().isString()
], searchTutors);

// Search forums
router.get('/forums', [
  query('q').optional().isString(),
  query('tags').optional().isString()
], searchForums);

// Autocomplete (future)
router.get('/autocomplete', [
  query('type').isIn(['course','tutor','forum']),
  query('q').isString()
], autocomplete);

export default router;
