import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';

describe('Flutterwave Webhook Handler', () => {
  const webhookPath = '/api/payments/flutterwave-webhook';
  const validHash = 'test_secret';

  beforeAll(async () => {
    process.env.FLUTTERWAVE_SECRET_KEY = validHash;
    await mongoose.connect(process.env.MONGO_URI_TEST || process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('returns 401 for missing or invalid signature', async () => {
    const res = await request(app)
      .post(webhookPath)
      .send({ event: 'charge.completed', data: { status: 'successful' } });
    expect(res.status).toBe(401);
    expect(res.text).toMatch(/Invalid signature/);
  });

  it('acknowledges valid webhook with 200', async () => {
    const res = await request(app)
      .post(webhookPath)
      .set('verif-hash', validHash)
      .send({ event: 'charge.completed', data: { status: 'successful' } });
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Webhook received/);
  });

  it('handles non-charge.completed events gracefully', async () => {
    const res = await request(app)
      .post(webhookPath)
      .set('verif-hash', validHash)
      .send({ event: 'charge.failed', data: { status: 'failed' } });
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Webhook received/);
  });
});