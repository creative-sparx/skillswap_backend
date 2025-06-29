import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import logger from './logger.js';

class MonitoringService {
  constructor() {
    this.initializeSentry();
    this.initializeAnalytics();
  }

  // Initialize Sentry for error tracking
  initializeSentry() {
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        
        // Performance Monitoring
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Tracing.Integrations.Express({ app: this.app }),
          new Tracing.Integrations.Mongo(),
        ],
        
        // Performance Monitoring sample rate
        tracesSampleRate: 0.1,
        
        // Release tracking
        release: process.env.npm_package_version,
        
        // Filter out health check requests
        beforeSend(event) {
          if (event.request?.url?.includes('/health')) {
            return null;
          }
          return event;
        },
      });

      logger.info('Sentry monitoring initialized');
    } else {
      logger.warn('Sentry not configured - running without error tracking');
    }
  }

  // Initialize analytics tracking
  initializeAnalytics() {
    this.analytics = {
      subscriptionMetrics: new Map(),
      paymentMetrics: new Map(),
      userMetrics: new Map(),
    };
  }

  // Express middleware for Sentry
  requestHandler() {
    return Sentry.Handlers.requestHandler();
  }

  errorHandler() {
    return Sentry.Handlers.errorHandler();
  }

  // Track subscription events
  trackSubscriptionEvent(eventType, data) {
    try {
      const eventData = {
        type: eventType,
        timestamp: new Date().toISOString(),
        ...data
      };

      // Send to Sentry as breadcrumb
      Sentry.addBreadcrumb({
        message: `Subscription Event: ${eventType}`,
        category: 'subscription',
        level: 'info',
        data: eventData,
      });

      // Track in local metrics
      if (!this.analytics.subscriptionMetrics.has(eventType)) {
        this.analytics.subscriptionMetrics.set(eventType, []);
      }
      this.analytics.subscriptionMetrics.get(eventType).push(eventData);

      // Log for debugging
      logger.info('Subscription event tracked', eventData);

      // Send to external analytics if configured
      this.sendToExternalAnalytics('subscription', eventData);
    } catch (error) {
      logger.error('Failed to track subscription event:', error);
    }
  }

  // Track payment events
  trackPaymentEvent(eventType, data) {
    try {
      const eventData = {
        type: eventType,
        timestamp: new Date().toISOString(),
        amount: data.amount,
        currency: data.currency,
        userId: data.userId,
        success: data.success,
        ...data
      };

      // Send to Sentry
      Sentry.addBreadcrumb({
        message: `Payment Event: ${eventType}`,
        category: 'payment',
        level: data.success ? 'info' : 'warning',
        data: eventData,
      });

      // Track in local metrics
      if (!this.analytics.paymentMetrics.has(eventType)) {
        this.analytics.paymentMetrics.set(eventType, []);
      }
      this.analytics.paymentMetrics.get(eventType).push(eventData);

      logger.info('Payment event tracked', eventData);
      this.sendToExternalAnalytics('payment', eventData);
    } catch (error) {
      logger.error('Failed to track payment event:', error);
    }
  }

  // Track user behavior
  trackUserEvent(eventType, data) {
    try {
      const eventData = {
        type: eventType,
        timestamp: new Date().toISOString(),
        userId: data.userId,
        ...data
      };

      Sentry.addBreadcrumb({
        message: `User Event: ${eventType}`,
        category: 'user',
        level: 'info',
        data: eventData,
      });

      if (!this.analytics.userMetrics.has(eventType)) {
        this.analytics.userMetrics.set(eventType, []);
      }
      this.analytics.userMetrics.get(eventType).push(eventData);

      logger.info('User event tracked', eventData);
      this.sendToExternalAnalytics('user', eventData);
    } catch (error) {
      logger.error('Failed to track user event:', error);
    }
  }

  // Send to external analytics services
  sendToExternalAnalytics(category, data) {
    // Mixpanel integration
    if (process.env.MIXPANEL_TOKEN) {
      this.sendToMixpanel(category, data);
    }

    // Google Analytics integration
    if (process.env.GOOGLE_ANALYTICS_ID) {
      this.sendToGoogleAnalytics(category, data);
    }
  }

  // Mixpanel integration
  sendToMixpanel(category, data) {
    try {
      // TODO: Implement Mixpanel SDK integration
      logger.debug('Sending to Mixpanel', { category, data });
    } catch (error) {
      logger.error('Mixpanel tracking failed:', error);
    }
  }

  // Google Analytics integration
  sendToGoogleAnalytics(category, data) {
    try {
      // TODO: Implement Google Analytics measurement protocol
      logger.debug('Sending to Google Analytics', { category, data });
    } catch (error) {
      logger.error('Google Analytics tracking failed:', error);
    }
  }

  // Get metrics summary
  getMetrics() {
    return {
      subscription: this.getSubscriptionMetrics(),
      payment: this.getPaymentMetrics(),
      user: this.getUserMetrics(),
      system: this.getSystemMetrics(),
    };
  }

  // Get subscription metrics
  getSubscriptionMetrics() {
    const metrics = {};
    
    this.analytics.subscriptionMetrics.forEach((events, eventType) => {
      metrics[eventType] = {
        count: events.length,
        recent: events.slice(-10), // Last 10 events
      };
    });

    return metrics;
  }

  // Get payment metrics
  getPaymentMetrics() {
    const metrics = {};
    
    this.analytics.paymentMetrics.forEach((events, eventType) => {
      const successfulPayments = events.filter(e => e.success);
      const failedPayments = events.filter(e => !e.success);
      
      metrics[eventType] = {
        total: events.length,
        successful: successfulPayments.length,
        failed: failedPayments.length,
        successRate: events.length > 0 ? (successfulPayments.length / events.length * 100).toFixed(2) : 0,
        totalAmount: events.reduce((sum, e) => sum + (e.amount || 0), 0),
      };
    });

    return metrics;
  }

  // Get user metrics
  getUserMetrics() {
    const metrics = {};
    
    this.analytics.userMetrics.forEach((events, eventType) => {
      const uniqueUsers = new Set(events.map(e => e.userId)).size;
      
      metrics[eventType] = {
        totalEvents: events.length,
        uniqueUsers: uniqueUsers,
        recent: events.slice(-10),
      };
    });

    return metrics;
  }

  // Get system metrics
  getSystemMetrics() {
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
  }

  // Health check with metrics
  getHealthStatus() {
    const memoryUsage = process.memoryUsage();
    const freeMemory = memoryUsage.heapTotal - memoryUsage.heapUsed;
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        free: Math.round(freeMemory / 1024 / 1024) + ' MB',
      },
      version: process.env.npm_package_version,
      environment: process.env.NODE_ENV,
    };
  }

  // Error reporting
  captureException(error, context = {}) {
    logger.error('Exception captured:', error);
    
    if (process.env.NODE_ENV === 'production') {
      Sentry.withScope(scope => {
        Object.keys(context).forEach(key => {
          scope.setTag(key, context[key]);
        });
        Sentry.captureException(error);
      });
    }
  }

  // Performance tracking
  startTransaction(name, operation) {
    if (process.env.NODE_ENV === 'production') {
      return Sentry.startTransaction({ name, op: operation });
    }
    return { finish: () => {} }; // Mock for development
  }

  // Cleanup metrics (keep only last 1000 events per type)
  cleanupMetrics() {
    const maxEvents = 1000;
    
    this.analytics.subscriptionMetrics.forEach((events, eventType) => {
      if (events.length > maxEvents) {
        this.analytics.subscriptionMetrics.set(eventType, events.slice(-maxEvents));
      }
    });

    this.analytics.paymentMetrics.forEach((events, eventType) => {
      if (events.length > maxEvents) {
        this.analytics.paymentMetrics.set(eventType, events.slice(-maxEvents));
      }
    });

    this.analytics.userMetrics.forEach((events, eventType) => {
      if (events.length > maxEvents) {
        this.analytics.userMetrics.set(eventType, events.slice(-maxEvents));
      }
    });
  }
}

// Create singleton instance
const monitoring = new MonitoringService();

// Cleanup metrics every hour
setInterval(() => {
  monitoring.cleanupMetrics();
}, 60 * 60 * 1000);

export default monitoring;
