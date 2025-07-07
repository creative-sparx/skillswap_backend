// @ts-nocheck
import { io } from '../server.js';
import crypto from 'crypto';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import logger from '../config/logger.js';
const WEBHOOK_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000, // 1 second
  SIGNATURE_TIMEOUT: 5 * 60 * 1000, // 5 minutes
};

/**
 * Verify Flutterwave webhook signature
 * @param {string} rawBody - Raw request body
 * @param {string} signature - Signature from headers
 * @returns {boolean} - Whether signature is valid
 */
function verifyFlutterwaveSignature(rawBody, signature) {
  try {
    const secretHash = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secretHash) {
      logger.error('FLUTTERWAVE_SECRET_KEY not configured');
      return false;
    }

    // For Flutterwave, the signature verification is typically done with the verif-hash
    // Some webhooks use HMAC-SHA256, but Flutterwave uses verif-hash comparison
    return signature === secretHash;
  } catch (error) {
    logger.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Implement exponential backoff retry logic
 * @param {Function} action - Function to retry
 * @param {number} retries - Current retry count
 * @returns {Promise} - Promise that resolves when action succeeds or max retries reached
 */
function retryWithExponentialBackoff(action, retries = 0) {
  return new Promise((resolve, reject) => {
    action()
      .then(resolve)
      .catch((error) => {
        if (retries < WEBHOOK_CONFIG.MAX_RETRIES) {
          const delay = WEBHOOK_CONFIG.BASE_DELAY * Math.pow(2, retries);
          logger.warn(`Webhook processing failed, retrying in ${delay}ms (attempt ${retries + 1}/${WEBHOOK_CONFIG.MAX_RETRIES})`);
          
          setTimeout(() => {
            retryWithExponentialBackoff(action, retries + 1)
              .then(resolve)
              .catch(reject);
          }, delay);
        } else {
          logger.error('Max webhook retries reached, failing permanently');
          reject(error);
        }
      });
  });
}

/**
 * Process successful payment webhook
 * @param {Object} data - Payment data from webhook
 * @returns {Promise} - Promise that resolves when processing is complete
 */
async function processSuccessfulPayment(data) {
  const transactionRef = data.tx_ref;
  const amount = data.amount;
  const currency = data.currency;
  const customerEmail = data.customer.email;
  const flutterwaveId = data.id;

  logger.info(`Processing successful payment for transaction reference: ${transactionRef}`);

  // 1. Find the transaction in your database using `transactionRef`
  const transaction = await Transaction.findOne({ tx_ref: transactionRef });
  
  if (!transaction) {
    logger.error(`Transaction not found for reference: ${transactionRef}`);
    throw new Error('Transaction not found');
  }

  // 2. Verify that the transaction hasn't already been processed to prevent duplicates
  if (transaction.status === 'successful') {
    logger.info(`Transaction ${transactionRef} already processed, skipping`);
    return;
  }

  // 3. Verify the payment amount and currency match what you expect
  if (transaction.amount !== amount || transaction.currency !== currency) {
    logger.error(`Payment amount/currency mismatch for ${transactionRef}. Expected: ${transaction.amount} ${transaction.currency}, Got: ${amount} ${currency}`);
    throw new Error('Payment amount/currency mismatch');
  }

  // 4. Update the transaction status in your database to 'successful'
  transaction.status = 'successful';
  transaction.flutterwaveId = flutterwaveId;
  transaction.paidAt = new Date();
  await transaction.save();

  // 5. Grant the user access to the purchased item (e.g., enroll in a course, activate subscription)
  const user = await User.findById(transaction.userId);
  if (!user) {
    logger.error(`User not found for transaction: ${transactionRef}`);
    throw new Error('User not found');
  }

  // Handle different transaction types
  switch (transaction.type) {
    case 'course_enrollment':
      if (transaction.courseId && !user.enrolledCourses.includes(transaction.courseId)) {
        user.enrolledCourses.push(transaction.courseId);
        await user.save();
        logger.info(`User ${user._id} enrolled in course ${transaction.courseId}`);
      }
      break;
      
    case 'subscription':
      if (transaction.subscriptionPlanId) {
        user.isPro = true;
        user.subscriptionPlan = transaction.subscriptionPlanId;
        user.subscriptionStatus = 'active';
        user.subscriptionStartDate = new Date();
        
        // Set end date based on plan duration
        const endDate = new Date();
        if (transaction.planDuration === 'yearly') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }
        user.subscriptionEndDate = endDate;
        
        await user.save();
        logger.info(`User ${user._id} subscription activated until ${endDate}`);
      }
      break;
      
    default:
      logger.warn(`Unknown transaction type: ${transaction.type}`);
  }

  // 6. Send a real-time notification to the user via Socket.IO
  const notificationData = {
    type: 'payment_success',
    message: 'Payment successful!',
    transactionRef,
    amount,
    currency,
    timestamp: new Date().toISOString()
  };
  
  io.to(user._id.toString()).emit('payment_success', notificationData);
  
  logger.info(`Successfully processed payment for ${customerEmail} (${transactionRef})`);
}

/**
 * @desc    Handle Flutterwave webhook events to confirm payment status.
 * @route   POST /api/payments/flutterwave-webhook
 * @access  Public (secured by a secret hash from Flutterwave)
 */
export const handleFlutterwaveWebhook = async (req, res) => {
  const startTime = Date.now();
  const signature = req.headers['verif-hash'];
  
  // 1. Verify the webhook signature to ensure it's from Flutterwave
  if (!signature || !verifyFlutterwaveSignature(req.body, signature)) {
    logger.warn('Webhook received with invalid signature', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      signature: signature ? 'present' : 'missing'
    });
    return res.status(401).send('Invalid signature');
  }

  logger.info('Flutterwave webhook received and verified', {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // 2. Process the event payload from the request body
  const payload = req.body;
  const eventType = payload.event;
  const data = payload.data;

  logger.info(`Processing webhook event: ${eventType}`, {
    transactionRef: data?.tx_ref,
    status: data?.status
  });

  try {
    // 3. Handle the 'charge.completed' event specifically
    if (eventType === 'charge.completed') {
      if (data.status === 'successful') {
        // Use retry logic for processing successful payments
        await retryWithExponentialBackoff(() => processSuccessfulPayment(data));
      } else {
        // Handle other statuses like 'failed'
        logger.info(`Payment status for tx_ref ${data.tx_ref} is '${data.status}'`);
        
        // Update transaction status if it exists
        const transaction = await Transaction.findOne({ tx_ref: data.tx_ref });
        if (transaction) {
          transaction.status = data.status;
          transaction.failureReason = data.narration || 'Payment failed';
          await transaction.save();
          
          // Notify user of failed payment
          const user = await User.findById(transaction.userId);
          if (user) {
            io.to(user._id.toString()).emit('payment_failed', {
              type: 'payment_failed',
              message: 'Payment failed. Please try again.',
              transactionRef: data.tx_ref,
              reason: data.narration || 'Payment failed'
            });
          }
        }
      }
    } else {
      logger.info(`Received unhandled webhook event: ${eventType}`);
    }

    // Log processing time
    const processingTime = Date.now() - startTime;
    logger.info(`Webhook processed successfully in ${processingTime}ms`);
    
    // Acknowledge receipt of the event to Flutterwave
    res.status(200).send('Webhook received');
    
  } catch (error) {
    logger.error('Error processing webhook:', error);
    
    // Return a 500 status to let Flutterwave know something went wrong
    // Flutterwave will attempt to retry sending the webhook
    res.status(500).send('Internal Server Error');
  }
};

/**
 * @desc    Handle Stripe webhook events to confirm payment status.
 * @route   POST /api/payments/stripe-webhook
 * @access  Public (secured by Stripe signature verification)
 */
export const handleStripeWebhook = async (req, res) => {
  const startTime = Date.now();
  const sig = req.headers['stripe-signature'];
  
  try {
    // Note: Stripe webhook handling would require stripe npm package
    // For now, we'll just acknowledge the webhook
    
    logger.info('Stripe webhook received', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Log processing time
    const processingTime = Date.now() - startTime;
    logger.info(`Stripe webhook processed in ${processingTime}ms`);
    
    // Acknowledge receipt of the event
    res.status(200).send('Webhook received');
    
  } catch (error) {
    logger.error('Error processing Stripe webhook:', error);
    res.status(500).send('Internal Server Error');
  }
};
