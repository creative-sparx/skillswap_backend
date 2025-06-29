import SubscriptionPlan from '../models/SubscriptionPlan.js';
import User from '../models/User.js';
import logger from '../config/logger.js';
import crypto from 'crypto';

// Helper functions for responses
const sendResponse = (res, status, message, data = null) => {
  res.status(status).json({
    success: true,
    message,
    data
  });
};

const sendError = (res, status, message, errors = null) => {
  res.status(status).json({
    success: false,
    message,
    errors
  });
};

class SubscriptionController {
  // GET /api/subscriptions - Get all available subscription plans
  async getSubscriptionPlans(req, res) {
    try {
      const plans = await SubscriptionPlan.find({ isActive: true })
        .sort({ order: 1, createdAt: 1 })
        .select('-flutterwaveId -stripeId'); // Hide payment provider IDs from public view

      sendResponse(res, 200, 'Subscription plans retrieved successfully', plans);
    } catch (error) {
      logger.error('Error fetching subscription plans:', error);
      sendError(res, 500, 'Failed to retrieve subscription plans');
    }
  }

  // POST /api/subscribe - Initiate subscription payment
  async initiateSubscription(req, res) {
    try {
      const { planId, redirectUrl } = req.body;
      const userId = req.user.id;

      if (!planId) {
        return sendError(res, 400, 'Subscription plan ID is required');
      }

      // Get the subscription plan
      const plan = await SubscriptionPlan.findById(planId);
      if (!plan || !plan.isActive) {
        return sendError(res, 404, 'Subscription plan not found or inactive');
      }

      // Get user details
      const user = await User.findById(userId);
      if (!user) {
        return sendError(res, 404, 'User not found');
      }

      // Check if user already has an active subscription
      if (user.isPro && user.subscriptionExpiresAt && user.subscriptionExpiresAt > new Date()) {
        return sendError(res, 400, 'User already has an active subscription');
      }

      // Create payment transaction reference
      const transactionRef = `SUB_${userId}_${planId}_${Date.now()}`;

      // Prepare payment data for Flutterwave
      const paymentData = {
        tx_ref: transactionRef,
        amount: plan.effectivePrice,
        currency: plan.currency,
        customer: {
          email: user.email,
          phone_number: user.phoneNumber || '',
          name: `${user.firstName} ${user.lastName}`
        },
        customizations: {
          title: 'SkillSwap Subscription',
          description: `Subscription to ${plan.name} plan`,
          logo: process.env.APP_LOGO_URL || ''
        },
        redirect_url: redirectUrl || `${process.env.FRONTEND_URL}/subscription/callback`,
        meta: {
          userId: userId,
          planId: planId,
          planName: plan.name,
          subscriptionType: 'new'
        }
      };

      // Initialize payment with Flutterwave (mock implementation for now)
      // TODO: Implement actual FlutterwaveService
      const paymentResponse = {
        success: true,
        data: {
          link: `${process.env.FRONTEND_URL}/payment/mock?ref=${transactionRef}&amount=${plan.effectivePrice}`
        }
      };

      if (!paymentResponse.success) {
        logger.error('Payment initialization failed:', paymentResponse.error);
        return sendError(res, 500, 'Failed to initialize payment');
      }

      // Store transaction reference in user record for verification
      user.pendingSubscriptionTransaction = transactionRef;
      user.pendingSubscriptionPlan = planId;
      await user.save();

      sendResponse(res, 200, 'Payment initialized successfully', {
        paymentUrl: paymentResponse.data.link,
        transactionRef: transactionRef,
        amount: plan.effectivePrice,
        currency: plan.currency,
        planName: plan.name
      });

    } catch (error) {
      logger.error('Error initiating subscription:', error);
      sendError(res, 500, 'Failed to initiate subscription');
    }
  }

  // POST /api/verify-subscription - Verify payment and activate subscription
  async verifySubscription(req, res) {
    try {
      const { transactionRef, transactionId } = req.body;
      const userId = req.user.id;

      if (!transactionRef && !transactionId) {
        return sendError(res, 400, 'Transaction reference or ID is required');
      }

      // Get user
      const user = await User.findById(userId);
      if (!user) {
        return sendError(res, 404, 'User not found');
      }

      // If transactionRef provided, verify it matches user's pending transaction
      if (transactionRef && user.pendingSubscriptionTransaction !== transactionRef) {
        return sendError(res, 400, 'Invalid transaction reference');
      }

      // Verify payment (mock implementation for now)
      // TODO: Implement actual FlutterwaveService verification
      const verificationResponse = {
        success: true,
        data: {
          status: 'successful',
          amount: 2999, // Mock amount
          tx_ref: transactionRef,
          meta: {
            planId: user.pendingSubscriptionPlan,
            userId: userId
          }
        }
      };

      if (!verificationResponse.success) {
        logger.error('Payment verification failed:', verificationResponse.error);
        return sendError(res, 400, 'Payment verification failed');
      }

      const paymentData = verificationResponse.data;

      // Check payment status
      if (paymentData.status !== 'successful') {
        return sendError(res, 400, `Payment ${paymentData.status}. Please try again.`);
      }

      // Get the subscription plan
      const planId = paymentData.meta?.planId || user.pendingSubscriptionPlan;
      const plan = await SubscriptionPlan.findById(planId);
      
      if (!plan) {
        logger.error('Subscription plan not found during verification:', planId);
        return sendError(res, 500, 'Subscription plan not found');
      }

      // Calculate subscription expiry date
      const now = new Date();
      const expiryDate = new Date(now);
      
      if (plan.duration === 'monthly') {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else if (plan.duration === 'yearly') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      }

      // Update user subscription status
      user.isPro = true;
      user.subscriptionPlan = planId;
      user.subscriptionStartedAt = now;
      user.subscriptionExpiresAt = expiryDate;
      user.subscriptionStatus = 'active';
      user.lastPaymentAmount = paymentData.amount;
      user.lastPaymentDate = now;
      user.lastPaymentReference = paymentData.tx_ref;
      
      // Clear pending transaction data
      user.pendingSubscriptionTransaction = undefined;
      user.pendingSubscriptionPlan = undefined;

      await user.save();

      logger.info(`User ${userId} subscription activated successfully`, {
        planId,
        planName: plan.name,
        expiryDate,
        transactionRef: paymentData.tx_ref
      });

      sendResponse(res, 200, 'Subscription activated successfully', {
        subscriptionStatus: 'active',
        planName: plan.name,
        expiresAt: expiryDate,
        features: plan.features
      });

    } catch (error) {
      logger.error('Error verifying subscription:', error);
      sendError(res, 500, 'Failed to verify subscription');
    }
  }

  // GET /api/my-subscription - Get current user's subscription status
  async getMySubscription(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId).populate('subscriptionPlan');

      if (!user) {
        return sendError(res, 404, 'User not found');
      }

      const subscriptionData = {
        isPro: user.isPro,
        subscriptionStatus: user.subscriptionStatus || 'inactive',
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        subscriptionStartedAt: user.subscriptionStartedAt,
        plan: user.subscriptionPlan ? {
          name: user.subscriptionPlan.name,
          features: user.subscriptionPlan.features,
          limits: user.subscriptionPlan.limits
        } : null,
        daysRemaining: user.subscriptionExpiresAt 
          ? Math.max(0, Math.ceil((user.subscriptionExpiresAt - new Date()) / (1000 * 60 * 60 * 24)))
          : 0
      };

      sendResponse(res, 200, 'Subscription status retrieved successfully', subscriptionData);
    } catch (error) {
      logger.error('Error fetching user subscription:', error);
      sendError(res, 500, 'Failed to retrieve subscription status');
    }
  }

  // POST /api/cancel-subscription - Cancel current subscription (set to expire at end of period)
  async cancelSubscription(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return sendError(res, 404, 'User not found');
      }

      if (!user.isPro || !user.subscriptionExpiresAt) {
        return sendError(res, 400, 'No active subscription to cancel');
      }

      // Mark subscription as cancelled (will expire naturally)
      user.subscriptionStatus = 'cancelled';
      await user.save();

      logger.info(`User ${userId} cancelled subscription`, {
        expiresAt: user.subscriptionExpiresAt
      });

      sendResponse(res, 200, 'Subscription cancelled successfully', {
        message: 'Your subscription will remain active until the end of your billing period',
        expiresAt: user.subscriptionExpiresAt
      });

    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      sendError(res, 500, 'Failed to cancel subscription');
    }
  }

  // Admin endpoint to create subscription plans
  async createSubscriptionPlan(req, res) {
    try {
      const planData = req.body;
      
      const plan = new SubscriptionPlan(planData);
      await plan.save();

      logger.info('New subscription plan created:', plan.name);
      sendResponse(res, 201, 'Subscription plan created successfully', plan);
    } catch (error) {
      if (error.code === 11000) {
        return sendError(res, 400, 'A subscription plan with this name already exists');
      }
      logger.error('Error creating subscription plan:', error);
      sendError(res, 500, 'Failed to create subscription plan');
    }
  }

  // Admin endpoint to update subscription plans
  async updateSubscriptionPlan(req, res) {
    try {
      const { planId } = req.params;
      const updateData = req.body;

      const plan = await SubscriptionPlan.findByIdAndUpdate(
        planId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!plan) {
        return sendError(res, 404, 'Subscription plan not found');
      }

      logger.info('Subscription plan updated:', plan.name);
      sendResponse(res, 200, 'Subscription plan updated successfully', plan);
    } catch (error) {
      logger.error('Error updating subscription plan:', error);
      sendError(res, 500, 'Failed to update subscription plan');
    }
  }

  // POST /api/subscriptions/webhook - Handle Flutterwave webhook for subscription updates
  async handleWebhook(req, res) {
    try {
      const payload = req.body;
      const signature = req.headers['verif-hash'];
      
      // Verify webhook signature
      const isValidSignature = this.verifyWebhookSignature(payload, signature);
      
      if (!isValidSignature) {
        logger.warn('Invalid webhook signature detected', {
          signature,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        return res.status(401).json({ error: 'Invalid signature' });
      }

      logger.info('Webhook received and verified:', {
        event: payload.event,
        txRef: payload.data?.tx_ref,
        status: payload.data?.status
      });

      // Process webhook based on event type
      switch (payload.event) {
      case 'charge.completed':
        await this.handleChargeCompleted(payload.data);
        break;
      case 'transfer.completed':
        // Handle transfer completed if needed for refunds
        break;
      default:
        logger.info('Unhandled webhook event:', payload.event);
      }

      // Return success response to Flutterwave
      res.status(200).json({ status: 'success' });

    } catch (error) {
      logger.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  // Verify webhook signature using HMAC SHA256
  verifyWebhookSignature(payload, signature) {
    try {
      const secretHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
      
      if (!secretHash) {
        logger.error('FLUTTERWAVE_WEBHOOK_HASH environment variable not set');
        return false;
      }

      // Create HMAC hash of the payload
      const hash = crypto.createHmac('sha256', secretHash)
        .update(JSON.stringify(payload))
        .digest('hex');

      // Compare hashes securely
      return crypto.timingSafeEqual(
        Buffer.from(signature || '', 'hex'),
        Buffer.from(hash, 'hex')
      );
    } catch (error) {
      logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  // Handle successful charge completion
  async handleChargeCompleted(data) {
    try {
      const { tx_ref, status, amount, currency, customer, meta } = data;

      // Only process successful payments
      if (status !== 'successful') {
        logger.info('Skipping non-successful payment:', { tx_ref, status });
        return;
      }

      // Extract user and plan info from metadata
      const userId = meta?.userId;
      const planId = meta?.planId;

      if (!userId || !planId) {
        logger.warn('Missing user or plan info in webhook metadata:', { tx_ref, meta });
        return;
      }

      // Find the user
      const user = await User.findById(userId);
      if (!user) {
        logger.warn('User not found for webhook:', { userId, tx_ref });
        return;
      }

      // Check if this transaction has already been processed
      if (user.lastPaymentReference === tx_ref) {
        logger.info('Transaction already processed:', { tx_ref, userId });
        return;
      }

      // Get the subscription plan
      const plan = await SubscriptionPlan.findById(planId);
      if (!plan) {
        logger.warn('Subscription plan not found for webhook:', { planId, tx_ref });
        return;
      }

      // Calculate subscription expiry date
      const now = new Date();
      const expiryDate = new Date(now);
      
      if (plan.duration === 'monthly') {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else if (plan.duration === 'yearly') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      }

      // Update user subscription status
      user.isPro = true;
      user.subscriptionPlan = planId;
      user.subscriptionStartedAt = now;
      user.subscriptionExpiresAt = expiryDate;
      user.subscriptionStatus = 'active';
      user.lastPaymentAmount = amount;
      user.lastPaymentDate = now;
      user.lastPaymentReference = tx_ref;
      
      // Clear pending transaction data
      user.pendingSubscriptionTransaction = undefined;
      user.pendingSubscriptionPlan = undefined;

      await user.save();

      logger.info('Subscription activated via webhook:', {
        userId,
        planId,
        planName: plan.name,
        expiryDate,
        tx_ref
      });

    } catch (error) {
      logger.error('Error handling charge completed webhook:', error);
    }
  }
}

const subscriptionController = new SubscriptionController();

export const {
  getSubscriptionPlans,
  initiateSubscription,
  verifySubscription,
  getMySubscription,
  cancelSubscription,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  handleWebhook
} = subscriptionController;

export default subscriptionController;
