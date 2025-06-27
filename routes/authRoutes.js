import express from 'express';
import { register, login, logout, getProfile } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { body } from 'express-validator';

const router = express.Router();

// POST /api/auth/register - User registration
router.post('/register', [
  // body('email').isEmail().normalizeEmail(),
  // body('password').isLength({ min: 6 }),
  // body('firstName').trim().notEmpty(),
  // body('lastName').trim().notEmpty(),
  // body('username').trim().notEmpty()
], register);

// POST /api/auth/login - User login
router.post('/login', [
  // body('email').isEmail().normalizeEmail(),
  // body('password').notEmpty()
], login);

// POST /api/auth/logout - User logout
router.post('/logout', logout);

// GET /api/auth/profile - Get user profile (protected)
router.get('/profile', protect, getProfile);

export default router;
