import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import logger from '../config/logger.js';

class EnhancedNotificationService {
  constructor() {
    // Initialize SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }

    // Initialize Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    this.fromEmail = process.env.FROM_EMAIL || 'noreply@skillswap.com';
    this.fromPhone = process.env.TWILIO_PHONE_NUMBER;
  }

  // Send email notification
  async sendEmail(notificationData) {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        logger.warn('SendGrid not configured, skipping email notification');
        return { success: true, method: 'mock' };
      }

      const emailTemplate = this.getEmailTemplate(notificationData.type, notificationData.data);
      
      const msg = {
        to: notificationData.email,
        from: this.fromEmail,
        subject: notificationData.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
        // Add tracking
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
      };

      const result = await sgMail.send(msg);
      logger.info(`Email sent successfully to ${notificationData.email}`, {
        messageId: result[0].headers['x-message-id'],
        type: notificationData.type
      });

      return { success: true, messageId: result[0].headers['x-message-id'] };
    } catch (error) {
      logger.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Send SMS notification
  async sendSMS(phoneNumber, message) {
    try {
      if (!this.twilioClient) {
        logger.warn('Twilio not configured, skipping SMS notification');
        return { success: true, method: 'mock' };
      }

      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.fromPhone,
        to: phoneNumber,
      });

      logger.info(`SMS sent successfully to ${phoneNumber}`, {
        sid: result.sid,
        status: result.status
      });

      return { success: true, sid: result.sid };
    } catch (error) {
      logger.error('SMS sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Send in-app notification (placeholder for real-time notifications)
  async sendInApp(notificationData) {
    try {
      // TODO: Implement with Socket.IO or Firebase Cloud Messaging
      logger.info(`In-app notification queued for user ${notificationData.userId}`, {
        type: notificationData.type,
        title: notificationData.title
      });

      // For now, just log the notification
      return { success: true, method: 'queued' };
    } catch (error) {
      logger.error('In-app notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Main send method with multiple channels
  async send(notificationData) {
    const results = {};

    try {
      // Always send email
      if (notificationData.email) {
        results.email = await this.sendEmail(notificationData);
      }

      // Send SMS for critical notifications
      if (notificationData.phone && this.isCriticalNotification(notificationData.type)) {
        const smsMessage = this.getSMSMessage(notificationData.type, notificationData.data);
        results.sms = await this.sendSMS(notificationData.phone, smsMessage);
      }

      // Always send in-app notification
      if (notificationData.userId) {
        results.inApp = await this.sendInApp({
          userId: notificationData.userId,
          title: notificationData.subject,
          message: this.getShortMessage(notificationData.type, notificationData.data),
          type: this.getNotificationType(notificationData.type),
          actionUrl: notificationData.actionUrl
        });
      }

      logger.info('Notification sent successfully', {
        type: notificationData.type,
        userId: notificationData.userId,
        channels: Object.keys(results)
      });

      return { success: true, results };
    } catch (error) {
      logger.error('Notification sending failed:', error);
      return { success: false, error: error.message, results };
    }
  }

  // Check if notification is critical (requires SMS)
  isCriticalNotification(type) {
    const criticalTypes = [
      'payment_failed',
      'subscription_expired',
      'account_suspended',
      'security_alert'
    ];
    return criticalTypes.includes(type);
  }

  // Get email template based on notification type
  getEmailTemplate(type, data) {
    const templates = {
      subscription_renewed: {
        html: this.getSubscriptionRenewedHTML(data),
        text: `Hi ${data.userName}, your ${data.planName} subscription has been successfully renewed for ₦${data.amount}. Next billing date: ${new Date(data.nextBillingDate).toLocaleDateString()}.`
      },
      payment_failed: {
        html: this.getPaymentFailedHTML(data),
        text: `Hi ${data.userName}, your payment for ${data.planName} failed: ${data.errorReason}. Please update your payment method to continue your subscription.`
      },
      subscription_expired: {
        html: this.getSubscriptionExpiredHTML(data),
        text: `Hi ${data.userName}, your ${data.planName} subscription has expired. Renew now to continue accessing premium features.`
      },
      welcome: {
        html: this.getWelcomeHTML(data),
        text: `Welcome to SkillSwap Premium, ${data.userName}! Your ${data.planName} subscription is now active.`
      }
    };

    return templates[type] || {
      html: `<p>Hi ${data.userName || 'User'},</p><p>You have a new notification from SkillSwap.</p>`,
      text: `Hi ${data.userName || 'User'}, you have a new notification from SkillSwap.`
    };
  }

  // Get SMS message based on notification type
  getSMSMessage(type, data) {
    const messages = {
      payment_failed: `SkillSwap: Payment failed for ${data.planName}. Please update your payment method.`,
      subscription_expired: `SkillSwap: Your ${data.planName} subscription expired. Renew to continue access.`,
      security_alert: `SkillSwap Security: Unusual activity detected on your account. Please verify.`
    };

    return messages[type] || `SkillSwap: You have a new notification.`;
  }

  // Get short message for in-app notifications
  getShortMessage(type, data) {
    const messages = {
      subscription_renewed: `Your ${data.planName} subscription renewed successfully!`,
      payment_failed: `Payment failed. Please update your payment method.`,
      subscription_expired: `Your subscription has expired. Renew now!`,
      welcome: `Welcome to SkillSwap Premium!`
    };

    return messages[type] || 'You have a new notification.';
  }

  // Get notification type for UI styling
  getNotificationType(type) {
    const typeMap = {
      subscription_renewed: 'success',
      payment_failed: 'error',
      subscription_expired: 'warning',
      welcome: 'info'
    };

    return typeMap[type] || 'info';
  }

  // HTML Email Templates
  getSubscriptionRenewedHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Subscription Renewed</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #008080; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .success-badge { background: #4CAF50; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; }
          .amount { font-size: 24px; font-weight: bold; color: #008080; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SkillSwap</h1>
            <span class="success-badge">Payment Successful</span>
          </div>
          <div class="content">
            <h2>Hi ${data.userName}!</h2>
            <p>Great news! Your <strong>${data.planName}</strong> subscription has been successfully renewed.</p>
            
            <div style="background: white; padding: 15px; border-left: 4px solid #008080; margin: 20px 0;">
              <p><strong>Amount Charged:</strong> <span class="amount">₦${data.amount}</span></p>
              <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
              <p><strong>Renewal Date:</strong> ${new Date(data.renewalDate).toLocaleDateString()}</p>
              <p><strong>Next Billing:</strong> ${new Date(data.nextBillingDate).toLocaleDateString()}</p>
            </div>

            <p>Continue enjoying all your premium features:</p>
            <ul>
              <li>🤖 AI Learning Assistant</li>
              <li>📜 Course Certificates</li>
              <li>🎓 Exclusive Premium Courses</li>
              <li>⭐ Priority Support</li>
            </ul>

            <p style="text-align: center; margin: 30px 0;">
              <a href="https://skillswap.com/dashboard" style="background: #008080; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Access Dashboard</a>
            </p>
          </div>
          <div class="footer">
            <p>© 2025 SkillSwap. All rights reserved.</p>
            <p>Questions? Contact us at support@skillswap.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPaymentFailedHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Failed</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #d32f2f; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .warning-badge { background: #ff9800; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; }
          .cta-button { background: #008080; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SkillSwap</h1>
            <span class="warning-badge">Action Required</span>
          </div>
          <div class="content">
            <h2>Hi ${data.userName},</h2>
            <p>We encountered an issue processing your payment for <strong>${data.planName}</strong>.</p>
            
            <div style="background: #ffebee; padding: 15px; border-left: 4px solid #d32f2f; margin: 20px 0;">
              <p><strong>Error:</strong> ${data.errorReason}</p>
              <p><strong>Date:</strong> ${new Date(data.failureDate).toLocaleDateString()}</p>
            </div>

            <p><strong>What happens next?</strong></p>
            <ul>
              <li>Your account remains active for 3 more days</li>
              <li>Update your payment method to avoid service interruption</li>
              <li>We'll automatically retry the payment</li>
            </ul>

            <p style="text-align: center;">
              <a href="https://skillswap.com/subscription/payment-methods" class="cta-button">Update Payment Method</a>
            </p>

            <p><em>Need help? Our support team is here to assist you.</em></p>
          </div>
          <div class="footer">
            <p>© 2025 SkillSwap. All rights reserved.</p>
            <p>Contact: support@skillswap.com | +234-XXX-XXXX</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getSubscriptionExpiredHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Subscription Expired</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .renew-button { background: #008080; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SkillSwap</h1>
            <h2>Subscription Expired</h2>
          </div>
          <div class="content">
            <h2>Hi ${data.userName},</h2>
            <p>Your <strong>${data.planName}</strong> subscription has expired, but it's not too late to continue your learning journey!</p>
            
            <p><strong>What you're missing:</strong></p>
            <ul>
              <li>🤖 AI-powered learning assistance</li>
              <li>📜 Downloadable certificates</li>
              <li>🎓 Access to premium courses</li>
              <li>⭐ Priority support</li>
            </ul>

            <p style="text-align: center; margin: 30px 0;">
              <a href="https://skillswap.com/subscription/renew" class="renew-button">Renew Subscription</a>
            </p>

            <p><em>Special offer: Renew within 7 days and get 20% off your next billing cycle!</em></p>
          </div>
          <div class="footer">
            <p>© 2025 SkillSwap. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getWelcomeHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to SkillSwap Premium</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #008080, #6A1B9A); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .welcome-badge { background: #4CAF50; color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; }
          .feature-card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #008080; }
          .get-started-btn { background: #008080; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to SkillSwap Premium!</h1>
            <span class="welcome-badge">Subscription Active</span>
          </div>
          <div class="content">
            <h2>Hi ${data.userName}!</h2>
            <p>Congratulations! Your <strong>${data.planName}</strong> subscription is now active. You've unlocked the full power of SkillSwap!</p>
            
            <h3>Your Premium Features:</h3>
            
            <div class="feature-card">
              <h4>🤖 AI Learning Assistant</h4>
              <p>Get personalized learning guidance, instant answers, and smart study recommendations.</p>
            </div>

            <div class="feature-card">
              <h4>📜 Course Certificates</h4>
              <p>Download official certificates for completed courses to showcase your skills.</p>
            </div>

            <div class="feature-card">
              <h4>🎓 Exclusive Premium Courses</h4>
              <p>Access our library of advanced courses created by industry experts.</p>
            </div>

            <div class="feature-card">
              <h4>⭐ Priority Support</h4>
              <p>Get priority access to our support team for any questions or issues.</p>
            </div>

            <p style="text-align: center; margin: 30px 0;">
              <a href="https://skillswap.com/dashboard" class="get-started-btn">Start Learning Now</a>
            </p>

            <p><em>Need help getting started? Check out our <a href="https://skillswap.com/help">Premium User Guide</a>.</em></p>
          </div>
          <div class="footer">
            <p>© 2025 SkillSwap. All rights reserved.</p>
            <p>Questions? We're here to help: support@skillswap.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export default new EnhancedNotificationService();
