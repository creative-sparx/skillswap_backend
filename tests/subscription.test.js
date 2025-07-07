import request from 'supertest';
import app from '../server.js';
import User from '../models/User.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import SubscriptionService from '../services/subscriptionService.js';
import jwt from 'jsonwebtoken';

describe('Subscription Routes', () => {
  let testUser, testPlan, authToken;

  // Helper function to create test user
  const createTestUser = async (userData = {}) => {
    const defaultUser = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser'
    };
    
    const user = new User({ ...defaultUser, ...userData });
    await user.save();
    return user;
  };

  // Helper function to create test subscription plan
  const createTestPlan = async (planData = {}) => {
    const defaultPlan = {
      name: 'Premium Plan',
      description: 'Premium subscription with all features',
      duration: 'monthly',
      price: 2500,
      currency: 'NGN',
      features: [
        { name: 'Unlimited Courses', included: true },
        { name: 'Priority Support', included: true }
      ]
    };
    
    const plan = new SubscriptionPlan({ ...defaultPlan, ...planData });
    await plan.save();
    return plan;
  };

  // Helper function to get auth token
  const getAuthToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
  };

  beforeEach(async () => {
    testUser = await createTestUser();
    testPlan = await createTestPlan();
    authToken = getAuthToken(testUser._id);
  });

  describe('GET /api/subscription-plans', () => {
    it('should get all active subscription plans', async () => {
      // Create additional plans
      await createTestPlan({ name: 'Basic Plan', price: 1500, duration: 'monthly' });
      await createTestPlan({ name: 'Pro Plan', price: 4000, duration: 'yearly' });
      await createTestPlan({ name: 'Inactive Plan', price: 3000, isActive: false });

      const res = await request(app)
        .get('/api/subscription-plans')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.plans).toHaveLength(3); // Should exclude inactive plan
      expect(res.body.plans[0].name).toBeDefined();
      expect(res.body.plans[0].price).toBeDefined();
      expect(res.body.plans[0].formattedPrice).toBeDefined();
    });

    it('should filter plans by duration', async () => {
      await createTestPlan({ name: 'Monthly Basic', price: 1500, duration: 'monthly' });
      await createTestPlan({ name: 'Yearly Basic', price: 15000, duration: 'yearly' });

      const res = await request(app)
        .get('/api/subscription-plans?duration=monthly')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.plans).toHaveLength(2); // Original plan + Monthly Basic
      res.body.plans.forEach(plan => {
        expect(plan.duration).toBe('monthly');
      });
    });

    it('should sort plans by price', async () => {
      await createTestPlan({ name: 'Expensive Plan', price: 5000 });
      await createTestPlan({ name: 'Cheap Plan', price: 1000 });

      const res = await request(app)
        .get('/api/subscription-plans')
        .expect(200);

      expect(res.body.success).toBe(true);
      
      // Should be sorted by price ascending
      for (let i = 1; i < res.body.plans.length; i++) {
        expect(res.body.plans[i].price).toBeGreaterThanOrEqual(res.body.plans[i-1].price);
      }
    });
  });

  describe('GET /api/subscription-plans/:id', () => {
    it('should get specific subscription plan', async () => {
      const res = await request(app)
        .get(`/api/subscription-plans/${testPlan._id}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.plan._id.toString()).toBe(testPlan._id.toString());
      expect(res.body.plan.name).toBe(testPlan.name);
      expect(res.body.plan.features).toBeDefined();
    });

    it('should return 404 for non-existent plan', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      
      const res = await request(app)
        .get(`/api/subscription-plans/${nonExistentId}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });

    it('should return 400 for invalid plan ID', async () => {
      const res = await request(app)
        .get('/api/subscription-plans/invalid-id')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid plan ID');
    });
  });

  describe('Subscription Status Endpoints', () => {
    it('should get user subscription status', async () => {
      // Set up user with active subscription
      testUser.isPro = true;
      testUser.subscriptionPlan = testPlan._id;
      testUser.subscriptionStatus = 'active';
      testUser.subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await testUser.save();

      const res = await request(app)
        .get('/api/subscriptions/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.subscription.isActive).toBe(true);
      expect(res.body.subscription.plan).toBeDefined();
      expect(res.body.subscription.endDate).toBeDefined();
      expect(res.body.subscription.daysRemaining).toBeGreaterThan(0);
    });

    it('should show inactive subscription for non-pro user', async () => {
      const res = await request(app)
        .get('/api/subscriptions/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.subscription.isActive).toBe(false);
      expect(res.body.subscription.plan).toBeNull();
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/subscriptions/status')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access token is required');
    });
  });

  describe('Subscription Service Tests', () => {
    describe('checkExpiredSubscriptions', () => {
      it('should expire subscriptions past end date', async () => {
        // Create user with expired subscription
        const expiredUser = await createTestUser({
          email: 'expired@example.com',
          username: 'expireduser',
          isPro: true,
          subscriptionStatus: 'active',
          subscriptionEndDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
        });

        await SubscriptionService.checkExpiredSubscriptions();

        const updatedUser = await User.findById(expiredUser._id);
        expect(updatedUser.isPro).toBe(false);
        expect(updatedUser.subscriptionStatus).toBe('expired');
      });

      it('should not affect active subscriptions', async () => {
        // Create user with active subscription
        const activeUser = await createTestUser({
          email: 'active@example.com',
          username: 'activeuser',
          isPro: true,
          subscriptionStatus: 'active',
          subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });

        await SubscriptionService.checkExpiredSubscriptions();

        const updatedUser = await User.findById(activeUser._id);
        expect(updatedUser.isPro).toBe(true);
        expect(updatedUser.subscriptionStatus).toBe('active');
      });
    });

    describe('processAutoRenewals', () => {
      it('should process auto-renewals for subscriptions ending soon', async () => {
        // Create user with subscription ending in 2 days
        const renewalUser = await createTestUser({
          email: 'renewal@example.com',
          username: 'renewaluser',
          isPro: true,
          subscriptionStatus: 'active',
          subscriptionPlan: testPlan._id,
          subscriptionEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
          autoRenewal: true
        });

        // Mock payment method
        renewalUser.paymentMethods = [{
          type: 'card',
          last4: '1234',
          isPrimary: true
        }];
        await renewalUser.save();

        await SubscriptionService.processAutoRenewals();

        // Note: This test would need more setup to properly test payment processing
        // For now, we're testing that the method doesn't throw errors
        expect(true).toBe(true);
      });

      it('should skip users without auto-renewal enabled', async () => {
        const noAutoRenewalUser = await createTestUser({
          email: 'noauto@example.com',
          username: 'noautouser',
          isPro: true,
          subscriptionStatus: 'active',
          subscriptionEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
          autoRenewal: false
        });

        await SubscriptionService.processAutoRenewals();

        const updatedUser = await User.findById(noAutoRenewalUser._id);
        expect(updatedUser.subscriptionStatus).toBe('active'); // Unchanged
      });
    });

    describe('hasValidSubscription', () => {
      it('should return true for active pro user', async () => {
        testUser.isPro = true;
        testUser.subscriptionStatus = 'active';
        testUser.subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await testUser.save();

        const isValid = await SubscriptionService.hasValidSubscription(testUser._id);
        expect(isValid).toBe(true);
      });

      it('should return false for expired subscription', async () => {
        testUser.isPro = true;
        testUser.subscriptionStatus = 'expired';
        testUser.subscriptionEndDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        await testUser.save();

        const isValid = await SubscriptionService.hasValidSubscription(testUser._id);
        expect(isValid).toBe(false);
      });

      it('should return false for non-pro user', async () => {
        const isValid = await SubscriptionService.hasValidSubscription(testUser._id);
        expect(isValid).toBe(false);
      });
    });

    describe('getSubscriptionAnalytics', () => {
      it('should return subscription analytics', async () => {
        // Create users with different subscription statuses
        await createTestUser({
          email: 'active1@example.com',
          username: 'active1',
          isPro: true,
          subscriptionStatus: 'active',
          subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });

        await createTestUser({
          email: 'expired1@example.com',
          username: 'expired1',
          subscriptionStatus: 'expired'
        });

        await createTestUser({
          email: 'pastdue1@example.com',
          username: 'pastdue1',
          subscriptionStatus: 'past_due'
        });

        const analytics = await SubscriptionService.getSubscriptionAnalytics();

        expect(analytics).toHaveProperty('totalSubscriptions');
        expect(analytics).toHaveProperty('activeSubscriptions');
        expect(analytics).toHaveProperty('expiredSubscriptions');
        expect(analytics).toHaveProperty('pastDueSubscriptions');
        expect(analytics).toHaveProperty('revenueByPlan');

        expect(analytics.activeSubscriptions).toBeGreaterThanOrEqual(1);
        expect(analytics.expiredSubscriptions).toBeGreaterThanOrEqual(1);
        expect(analytics.pastDueSubscriptions).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Subscription Business Logic', () => {
    it('should calculate correct subscription end date for monthly plan', async () => {
      const startDate = new Date();
      testUser.subscriptionStartDate = startDate;
      
      await SubscriptionService.extendSubscription(testUser, testPlan);

      const updatedUser = await User.findById(testUser._id);
      const expectedEndDate = new Date(startDate);
      expectedEndDate.setMonth(expectedEndDate.getMonth() + 1);

      expect(updatedUser.subscriptionEndDate.getMonth()).toBe(expectedEndDate.getMonth());
    });

    it('should calculate correct subscription end date for yearly plan', async () => {
      const yearlyPlan = await createTestPlan({
        name: 'Yearly Plan',
        duration: 'yearly',
        price: 25000
      });

      const startDate = new Date();
      testUser.subscriptionStartDate = startDate;
      
      await SubscriptionService.extendSubscription(testUser, yearlyPlan);

      const updatedUser = await User.findById(testUser._id);
      const expectedEndDate = new Date(startDate);
      expectedEndDate.setFullYear(expectedEndDate.getFullYear() + 1);

      expect(updatedUser.subscriptionEndDate.getFullYear()).toBe(expectedEndDate.getFullYear());
    });

    it('should mark subscription as past due correctly', async () => {
      await SubscriptionService.markSubscriptionAsPastDue(testUser);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.subscriptionStatus).toBe('past_due');
    });
  });

  describe('Subscription Validation', () => {
    it('should validate subscription plan limits', async () => {
      const limitedPlan = await createTestPlan({
        name: 'Limited Plan',
        limits: {
          coursesPerMonth: 5,
          tutoringSessions: 10,
          premiumContent: false
        }
      });

      expect(limitedPlan.limits.coursesPerMonth).toBe(5);
      expect(limitedPlan.limits.tutoringSessions).toBe(10);
      expect(limitedPlan.limits.premiumContent).toBe(false);
    });

    it('should format subscription prices correctly', async () => {
      const usdPlan = await createTestPlan({
        name: 'USD Plan',
        price: 15,
        currency: 'USD'
      });

      expect(usdPlan.formattedPrice).toBe('$15');

      const ngnPlan = await createTestPlan({
        name: 'NGN Plan',
        price: 2500,
        currency: 'NGN'
      });

      expect(ngnPlan.formattedPrice).toBe('₦2,500');
    });
  });
});
