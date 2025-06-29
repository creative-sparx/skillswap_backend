import User from '../models/User.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import cron from 'node-cron';
import logger from '../config/logger.js';
import notificationService from './notificationService.js';
import paymentGateway from './paymentGateway.js';

class SubscriptionService {
  // Initialize cron jobs for subscription management
  static initCronJobs() {
    // Run every day at 2 AM to check for expired subscriptions
    cron.schedule('0 2 * * *', () => {
      this.checkExpiredSubscriptions();
    });

    // Run every day at 3 AM to process auto-renewals
    cron.schedule('0 3 * * *', () => {
      this.processAutoRenewals();
    });

    logger.info('Subscription cron jobs initialized');
  }

  // Check and update expired subscriptions
  static async checkExpiredSubscriptions() {
    try {
      const now = new Date();
      
      const expiredUsers = await User.find({
        isPro: true,
        subscriptionStatus: { $in: ['active', 'past_due'] },
        subscriptionEndDate: { $lt: now }
      });

      logger.info(`Found ${expiredUsers.length} expired subscriptions`);

      for (const user of expiredUsers) {
        await this.expireSubscription(user);
      }
    } catch (error) {
      logger.error('Error checking expired subscriptions:', error);
    }
  }

  // Process auto-renewals for subscriptions ending soon
  static async processAutoRenewals() {
    try {
      // Find subscriptions expiring in the next 3 days
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const renewalCandidates = await User.find({
        isPro: true,
        subscriptionStatus: 'active',
        subscriptionEndDate: { $lte: threeDaysFromNow },
        autoRenewal: true
      }).populate('subscriptionPlan');

      logger.info(`Found ${renewalCandidates.length} subscriptions for auto-renewal`);

      for (const user of renewalCandidates) {
        await this.attemptAutoRenewal(user);
      }
    } catch (error) {
      logger.error('Error processing auto-renewals:', error);
    }
  }

  // Expire a subscription
  static async expireSubscription(user) {
    try {
      await User.findByIdAndUpdate(user._id, {
        isPro: false,
        subscriptionStatus: 'expired',
        subscriptionEndDate: new Date()
      });

      logger.info(`Expired subscription for user ${user._id}`);
      await this.sendExpirationNotification(user);
    } catch (error) {
      logger.error(`Error expiring subscription for user ${user._id}:`, error);
    }
  }

  // Send expiration notification (email or in-app)
  static async sendExpirationNotification(user) {
    // TODO: Integrate with emailService or notification system
    logger.info(`Sent expiration notification to user ${user._id}`);
  }

  // Attempt to auto-renew a subscription
  static async attemptAutoRenewal(user) {
    try {
      logger.info(`Starting auto-renewal attempt for user ${user._id} with plan ${user.subscriptionPlan.name}`);

      // Step 1: Retrieve user's preferred payment method
      const paymentMethod = await this.getUserPaymentMethod(user._id);
      if (!paymentMethod) {
        logger.warn(`No payment method found for user ${user._id}, marking as past due`);
        await this.markSubscriptionAsPastDue(user);
        await this.sendPaymentFailureNotification(user, 'No payment method available');
        return;
      }

      // Step 2: Get the subscription plan details
      const plan = user.subscriptionPlan;
      if (!plan || !plan.price) {
        logger.error(`Invalid subscription plan for user ${user._id}`);
        await this.markSubscriptionAsPastDue(user);
        return;
      }

      // Step 3: Attempt to charge for the appropriate plan
      logger.info(`Attempting to charge ${plan.price} ${plan.currency || 'NGN'} for user ${user._id}`);
      const paymentResult = await this.processPayment(user, plan, paymentMethod);

      // Step 4: Handle payment result
      if (paymentResult.success) {
        // Step 4a: Payment successful - extend subscription
        await this.extendSubscription(user, plan);
        logger.info(`Auto-renewal successful for user ${user._id}, transaction ID: ${paymentResult.transactionId}`);
        
        // Send success notification
        await this.sendRenewalSuccessNotification(user, plan, paymentResult.transactionId);
      } else {
        // Step 4b: Payment failed - mark as past due
        await this.markSubscriptionAsPastDue(user);
        logger.error(`Auto-renewal failed for user ${user._id}: ${paymentResult.error}`);
        
        // Send failure notification
        await this.sendPaymentFailureNotification(user, paymentResult.error);
      }
    } catch (error) {
      logger.error(`Critical error during auto-renewal for user ${user._id}:`, error);
      
      // On critical error, mark as past due and notify
      try {
        await this.markSubscriptionAsPastDue(user);
        await this.sendPaymentFailureNotification(user, 'System error during renewal');
      } catch (notificationError) {
        logger.error(`Failed to send error notification for user ${user._id}:`, notificationError);
      }
    }
  }

  // Retrieve user's preferred payment method
  static async getUserPaymentMethod(userId) {
    try {
      // TODO: Implement actual payment method retrieval from database
      // This would typically fetch from a PaymentMethods collection
      // For now, returning a mock payment method structure
      const user = await User.findById(userId).select('paymentMethods');
      
      if (!user || !user.paymentMethods || user.paymentMethods.length === 0) {
        return null;
      }

      // Return the primary payment method or the first available
      const primaryMethod = user.paymentMethods.find(pm => pm.isPrimary) || user.paymentMethods[0];
      return primaryMethod;
    } catch (error) {
      logger.error(`Error retrieving payment method for user ${userId}:`, error);
      return null;
    }
  }

  // Process payment through the payment gateway (Flutterwave or other)
  static async processPayment(user, plan, paymentMethod) {
    try {
      // TODO: Replace with actual payment gateway integration
      // Example: Flutterwave, Paystack, Stripe, etc.
      
      const paymentData = {
        amount: plan.price,
        currency: plan.currency || 'NGN',
        email: user.email,
        customer: {
          id: user._id.toString(),
          name: `${user.firstName} ${user.lastName}`,
          email: user.email
        },
        paymentMethod: paymentMethod,
        description: `Auto-renewal for ${plan.name} subscription`
      };

      // For now, using mock payment - replace with actual gateway call
      const result = await paymentGateway.chargeCustomer(paymentData);
      
      if (result.success) {
        logger.info(`Payment successful for user ${user._id}: ${result.transactionId}`);
        return {
          success: true,
          transactionId: result.transactionId,
          amount: result.amount,
          currency: result.currency
        };
      } else {
        logger.warn(`Payment failed for user ${user._id}: ${result.error}`);
        return {
          success: false,
          error: result.error || 'Payment processing failed'
        };
      }
    } catch (error) {
      logger.error(`Payment processing error for user ${user._id}:`, error);
      return {
        success: false,
        error: 'Payment system unavailable'
      };
    }
  }

  // Mock Flutterwave payment processing (kept for backward compatibility)
  static async mockFlutterwavePayment(user) {
    // Simulate random payment success/failure
    const success = Math.random() > 0.2; // 80% success rate
    logger.info(`Mock Flutterwave payment for user ${user._id}: ${success ? 'SUCCESS' : 'FAILURE'}`);
    return { success };
  }

  // Send renewal success notification
  static async sendRenewalSuccessNotification(user, plan, transactionId) {
    try {
      const notificationData = {
        userId: user._id,
        email: user.email,
        type: 'subscription_renewed',
        subject: 'Subscription Successfully Renewed',
        data: {
          userName: `${user.firstName} ${user.lastName}`,
          planName: plan.name,
          amount: plan.price,
          currency: plan.currency || 'NGN',
          transactionId: transactionId,
          renewalDate: new Date().toISOString(),
          nextBillingDate: this.calculateNextBillingDate(plan.duration)
        }
      };

      // Send email notification
      await notificationService.send(notificationData);
      
      // Send in-app notification
      await notificationService.sendInApp({
        userId: user._id,
        title: 'Subscription Renewed',
        message: `Your ${plan.name} subscription has been successfully renewed.`,
        type: 'success'
      });

      logger.info(`Sent renewal success notification to user ${user._id}`);
    } catch (error) {
      logger.error(`Error sending renewal success notification to user ${user._id}:`, error);
    }
  }

  // Send renewal notification (email or in-app) - kept for backward compatibility
  static async sendRenewalNotification(user, success) {
    if (success) {
      await this.sendRenewalSuccessNotification(user, user.subscriptionPlan, 'legacy_transaction');
    } else {
      await this.sendPaymentFailureNotification(user, 'Payment failed');
    }
  }

  // Extend a subscription after successful payment
  static async extendSubscription(user, plan = null) {
    try {
      const subscriptionPlan = plan || user.subscriptionPlan;
      const newEndDate = new Date(user.subscriptionEndDate);
      
      // Add duration based on plan type
      switch (subscriptionPlan.duration) {
      case 'monthly':
        newEndDate.setMonth(newEndDate.getMonth() + 1);
        break;
      case 'yearly':
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        break;
      case 'quarterly':
        newEndDate.setMonth(newEndDate.getMonth() + 3);
        break;
      default:
        throw new Error(`Unknown subscription duration: ${subscriptionPlan.duration}`);
      }

      await User.findByIdAndUpdate(user._id, {
        subscriptionEndDate: newEndDate,
        subscriptionStatus: 'active'
      });

      logger.info(`Extended subscription for user ${user._id} until ${newEndDate}`);
    } catch (error) {
      logger.error(`Error extending subscription for user ${user._id}:`, error);
    }
  }

  // Mark subscription as past due
  static async markSubscriptionAsPastDue(user) {
    try {
      await User.findByIdAndUpdate(user._id, {
        subscriptionStatus: 'past_due'
      });

      logger.info(`Marked subscription as past due for user ${user._id}`);
      await this.sendPaymentFailureNotification(user);
    } catch (error) {
      logger.error(`Error marking subscription as past due for user ${user._id}:`, error);
    }
  }

  // Send payment failure notification (email or in-app)
  static async sendPaymentFailureNotification(user, errorReason = 'Payment failed') {
    try {
      const notificationData = {
        userId: user._id,
        email: user.email,
        type: 'payment_failed',
        subject: 'Payment Failed - Action Required',
        data: {
          userName: `${user.firstName} ${user.lastName}`,
          planName: user.subscriptionPlan?.name || 'Premium Plan',
          errorReason: errorReason,
          failureDate: new Date().toISOString(),
          actionRequired: 'Please update your payment method to continue your subscription.'
        }
      };

      // Send email notification
      await notificationService.send(notificationData);
      
      // Send in-app notification
      await notificationService.sendInApp({
        userId: user._id,
        title: 'Payment Failed',
        message: `Your subscription renewal failed. Please update your payment method.`,
        type: 'error',
        actionUrl: '/subscription/payment-methods'
      });

      logger.info(`Sent payment failure notification to user ${user._id}: ${errorReason}`);
    } catch (error) {
      logger.error(`Error sending payment failure notification to user ${user._id}:`, error);
    }
  }

  // Check if a user has valid subscription
  static async hasValidSubscription(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.isPro) {
        return false;
      }

      const now = new Date();
      return user.subscriptionEndDate > now && 
             ['active', 'past_due'].includes(user.subscriptionStatus);
    } catch (error) {
      logger.error(`Error checking subscription validity for user ${userId}:`, error);
      return false;
    }
  }

  // Get subscription analytics
  static async getSubscriptionAnalytics() {
    try {
      const totalSubscriptions = await User.countDocuments({ isPro: true });
      const activeSubscriptions = await User.countDocuments({ 
        isPro: true, 
        subscriptionStatus: 'active',
        subscriptionEndDate: { $gt: new Date() }
      });
      const expiredSubscriptions = await User.countDocuments({ 
        subscriptionStatus: 'expired' 
      });
      const pastDueSubscriptions = await User.countDocuments({ 
        subscriptionStatus: 'past_due' 
      });

      // Get revenue by plan
      const revenueByPlan = await User.aggregate([
        {
          $match: { 
            isPro: true,
            subscriptionStatus: { $in: ['active', 'past_due'] }
          }
        },
        {
          $lookup: {
            from: 'subscriptionplans',
            localField: 'subscriptionPlan',
            foreignField: '_id',
            as: 'plan'
          }
        },
        {
          $unwind: '$plan'
        },
        {
          $group: {
            _id: '$plan.name',
            count: { $sum: 1 },
            revenue: { $sum: '$plan.price' }
          }
        }
      ]);

      return {
        totalSubscriptions,
        activeSubscriptions,
        expiredSubscriptions,
        pastDueSubscriptions,
        revenueByPlan
      };
    } catch (error) {
      logger.error('Error getting subscription analytics:', error);
      throw error;
    }
  }

  // Helper method to calculate next billing date
  static calculateNextBillingDate(duration) {
    const nextDate = new Date();
    
    switch (duration) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1); // Default to monthly
    }
    
    return nextDate.toISOString();
  }

  // Mark subscription as past due (alias for backward compatibility)
  static async markAsPastDue(user) {
    return await this.markSubscriptionAsPastDue(user);
  }
}

export default SubscriptionService;
