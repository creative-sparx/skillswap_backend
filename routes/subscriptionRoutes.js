import express from 'express';
import * as subscriptionController from '../controllers/subscriptionController.js';
import auth from '../middleware/auth.js';
import adminMiddleware from '../middleware/admin.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { body } from 'express-validator';

const router = express.Router();

// Public routes
router.get('/plans', subscriptionController.getSubscriptionPlans);
router.post('/webhook', subscriptionController.handleWebhook);

// Protected routes (require authentication)
router.use(auth); // All routes below this middleware require authentication

// Subscription validation middleware
const validateSubscription = [
  body('planId')
    .isMongoId()
    .withMessage('Valid plan ID is required'),
  handleValidationErrors
];

router.post('/subscribe', validateSubscription, subscriptionController.initiateSubscription);
router.post('/verify', subscriptionController.verifySubscription);
router.get('/my-subscription', subscriptionController.getMySubscription);
router.post('/cancel', subscriptionController.cancelSubscription);

// Admin routes (require admin role)
router.use(adminMiddleware); // All routes below this middleware require admin role

router.post('/plans', subscriptionController.createSubscriptionPlan);
router.put('/plans/:planId', subscriptionController.updateSubscriptionPlan);

export default router;
