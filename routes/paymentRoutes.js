import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  createCheckoutSession,
  createSubscription,
  createPayout,
  stripeWebhook
} from '../controllers/paymentController.js';

const router = express.Router();

// POST /api/payments/checkout - Create Stripe Checkout Session
router.post('/checkout', protect, createCheckoutSession);

// POST /api/payments/subscription - Create Stripe Subscription
router.post('/subscription', protect, createSubscription);

// POST /api/payments/payout - Create Stripe payout (tutor only)
router.post('/payout', protect, createPayout);

// POST /api/payments/webhook - Stripe webhook endpoint (no auth)
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

export default router;
