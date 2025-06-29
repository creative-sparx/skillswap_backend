import express from 'express';
import { handleFlutterwaveWebhook } from '../controllers/paymentController.js';
// import { initializePayment } from '../controllers/paymentController.js';
// import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// This route would be used by your frontend to start a payment
// router.post('/initialize', protect, initializePayment);

// This is the webhook route for Flutterwave to send events to
router.post('/flutterwave-webhook', handleFlutterwaveWebhook);

export default router;