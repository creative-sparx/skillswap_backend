import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';

describe('SubscriptionPlan API', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST || process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await SubscriptionPlan.deleteMany({});
  });

  afterAll(async () => {
    await SubscriptionPlan.deleteMany({});
    await mongoose.disconnect();
  });

  it('should create a new subscription plan', async () => {
    const payload = { name: 'Test Plan', price: 1000, billingInterval: 'monthly', features: ['feature1'] };
    const res = await request(app)
      .post('/api/subscription-plans')
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.plan).toHaveProperty('_id');
    expect(res.body.plan.name).toBe('Test Plan');
  });

  it('should fetch active subscription plans', async () => {
    const res = await request(app).get('/api/subscription-plans');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.plans)).toBe(true);
    expect(res.body.plans.length).toBeGreaterThan(0);
  });

  it('should update an existing plan', async () => {
    const plan = await SubscriptionPlan.findOne({ name: 'Test Plan' });
    const res = await request(app)
      .put(`/api/subscription-plans/${plan._id}`)
      .send({ price: 2000 });
    expect(res.status).toBe(200);
    expect(res.body.plan.price).toBe(2000);
  });

  it('should deactivate a plan', async () => {
    const plan = await SubscriptionPlan.findOne({ name: 'Test Plan' });
    const res = await request(app)
      .delete(`/api/subscription-plans/${plan._id}`);
    expect(res.status).toBe(200);
    const updated = await SubscriptionPlan.findById(plan._id);
    expect(updated.isActive).toBe(false);
  });
});