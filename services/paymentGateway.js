import axios from 'axios';
import logger from '../config/logger.js';

class PaymentGateway {
  constructor() {
    this.flutterwaveSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    this.flutterwavePublicKey = process.env.FLUTTERWAVE_PUBLIC_KEY;
    this.baseUrl = 'https://api.flutterwave.com/v3';
  }

  // Charge customer for subscription
  async chargeCustomer(paymentData) {
    try {
      logger.info(`Processing payment for ${paymentData.customer.email} - Amount: ${paymentData.amount}`);

      // For development/testing, simulate payment processing
      if (process.env.NODE_ENV !== 'production') {
        return this.simulatePayment(paymentData);
      }

      // Production Flutterwave integration
      const response = await axios.post(
        `${this.baseUrl}/charges?type=card`,
        {
          card_number: paymentData.paymentMethod.cardNumber,
          cvv: paymentData.paymentMethod.cvv,
          expiry_month: paymentData.paymentMethod.expiryMonth,
          expiry_year: paymentData.paymentMethod.expiryYear,
          currency: paymentData.currency,
          amount: paymentData.amount,
          email: paymentData.email,
          fullname: paymentData.customer.name,
          tx_ref: this.generateTransactionReference(),
          redirect_url: process.env.FLUTTERWAVE_REDIRECT_URL,
          authorization: {
            mode: 'pin',
            pin: paymentData.paymentMethod.pin
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.flutterwaveSecretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        return {
          success: true,
          transactionId: response.data.data.id,
          reference: response.data.data.tx_ref,
          amount: response.data.data.amount,
          currency: response.data.data.currency,
          status: response.data.data.status
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Payment failed'
        };
      }
    } catch (error) {
      logger.error('Payment processing error:', error);
      return {
        success: false,
        error: 'Payment processing failed'
      };
    }
  }

  // Simulate payment for development/testing
  simulatePayment(paymentData) {
    const isSuccess = Math.random() > 0.2; // 80% success rate
    const transactionId = this.generateTransactionReference();

    logger.info(`Simulated payment for ${paymentData.customer.email}: ${isSuccess ? 'SUCCESS' : 'FAILURE'}`);

    if (isSuccess) {
      return {
        success: true,
        transactionId: transactionId,
        reference: transactionId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: 'successful'
      };
    } else {
      const errorMessages = [
        'Insufficient funds',
        'Card declined',
        'Invalid card details',
        'Transaction timeout'
      ];
      
      return {
        success: false,
        error: errorMessages[Math.floor(Math.random() * errorMessages.length)]
      };
    }
  }

  // Verify payment status
  async verifyPayment(transactionId) {
    try {
      if (process.env.NODE_ENV !== 'production') {
        // Simulate verification for development
        return {
          success: true,
          status: 'successful',
          data: {
            id: transactionId,
            status: 'successful',
            amount: 1000,
            currency: 'NGN'
          }
        };
      }

      const response = await axios.get(
        `${this.baseUrl}/transactions/${transactionId}/verify`,
        {
          headers: {
            'Authorization': `Bearer ${this.flutterwaveSecretKey}`
          }
        }
      );

      return {
        success: response.data.status === 'success',
        status: response.data.data.status,
        data: response.data.data
      };
    } catch (error) {
      logger.error('Payment verification error:', error);
      return {
        success: false,
        error: 'Verification failed'
      };
    }
  }

  // Generate unique transaction reference
  generateTransactionReference() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `SS_${timestamp}_${random}`.toUpperCase();
  }

  // Create payment plan for recurring subscriptions
  async createPaymentPlan(planData) {
    try {
      if (process.env.NODE_ENV !== 'production') {
        return {
          success: true,
          planId: `plan_${Date.now()}`,
          planCode: planData.name.toLowerCase().replace(/\s+/g, '_')
        };
      }

      const response = await axios.post(
        `${this.baseUrl}/payment-plans`,
        {
          amount: planData.price,
          name: planData.name,
          interval: planData.duration, // monthly, yearly, etc.
          currency: planData.currency || 'NGN'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.flutterwaveSecretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: response.data.status === 'success',
        planId: response.data.data.id,
        planCode: response.data.data.plan_token
      };
    } catch (error) {
      logger.error('Payment plan creation error:', error);
      return {
        success: false,
        error: 'Plan creation failed'
      };
    }
  }

  // Subscribe customer to payment plan
  async subscribeCustomer(planId, customerData) {
    try {
      if (process.env.NODE_ENV !== 'production') {
        return {
          success: true,
          subscriptionId: `sub_${Date.now()}`,
          status: 'active'
        };
      }

      const response = await axios.post(
        `${this.baseUrl}/subscriptions`,
        {
          customer: customerData.email,
          plan: planId,
          card: customerData.paymentMethod
        },
        {
          headers: {
            'Authorization': `Bearer ${this.flutterwaveSecretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: response.data.status === 'success',
        subscriptionId: response.data.data.id,
        status: response.data.data.status
      };
    } catch (error) {
      logger.error('Customer subscription error:', error);
      return {
        success: false,
        error: 'Subscription failed'
      };
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId) {
    try {
      if (process.env.NODE_ENV !== 'production') {
        return { success: true };
      }

      const response = await axios.put(
        `${this.baseUrl}/subscriptions/${subscriptionId}/cancel`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.flutterwaveSecretKey}`
          }
        }
      );

      return { success: response.data.status === 'success' };
    } catch (error) {
      logger.error('Subscription cancellation error:', error);
      return {
        success: false,
        error: 'Cancellation failed'
      };
    }
  }
}

export default new PaymentGateway();
