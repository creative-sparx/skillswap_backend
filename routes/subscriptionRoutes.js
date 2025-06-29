const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { validateSubscription } = require('../middleware/validationMiddleware');

const router = express.Router();

// Public routes
router.get('/plans', subscriptionController.getSubscriptionPlans);
router.post('/webhook', subscriptionController.handleWebhook);

// Protected routes (require authentication)
router.use(protect); // All routes below this middleware require authentication

router.post('/subscribe', validateSubscription, subscriptionController.initiateSubscription);
router.post('/verify', subscriptionController.verifySubscription);
router.get('/my-subscription', subscriptionController.getMySubscription);
router.post('/cancel', subscriptionController.cancelSubscription);

// Admin routes (require admin role)
router.use(restrictTo('admin')); // All routes below this middleware require admin role

router.post('/plans', subscriptionController.createSubscriptionPlan);
router.put('/plans/:planId', subscriptionController.updateSubscriptionPlan);

module.exports = router;
