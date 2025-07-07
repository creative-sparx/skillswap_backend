import express from 'express';
import { handleFlutterwaveWebhook, handleStripeWebhook } from '../controllers/paymentController.js';

const router = express.Router();

// Webhook routes
// Flutterwave webhook (JSON body parsed and verified in controller)
router.post('/flutterwave-webhook', handleFlutterwaveWebhook);

// Stripe webhook (raw body parser needed for signature verification)
router.post(
  '/stripe-webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

export default router;
