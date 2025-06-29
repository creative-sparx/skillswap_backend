import request from 'supertest';
import app from '../server.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

describe('Authentication Endpoints', () => {
  beforeEach(async () => {
    // Clean up users collection before each test
    await User.deleteMany({});
  });

  afterAll(async () => {
    // Clean up after all tests
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      firebaseUid: 'firebase-uid-123'
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(validUserData.email);
      expect(response.body.user.firstName).toBe(validUserData.firstName);
      expect(response.body.user.lastName).toBe(validUserData.lastName);
      expect(response.body).toHaveProperty('token');

      // Verify user was created in database
      const user = await User.findOne({ email: validUserData.email });
      expect(user).toBeTruthy();
      expect(user.firebaseUid).toBe(validUserData.firebaseUid);
    });

    it('should hash the password before saving', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      const user = await User.findOne({ email: validUserData.email });
      expect(user.password).not.toBe(validUserData.password);
      
      // Verify password is properly hashed
      const isValidPassword = await bcrypt.compare(validUserData.password, user.password);
      expect(isValidPassword).toBe(true);
    });

    it('should return error for missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
          // Missing other required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should return error for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return error for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          password: '123' // Too weak
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return error if user already exists', async () => {
      // Create user first
      await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      // Try to register again with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should create user with default wallet balance', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      const user = await User.findOne({ email: validUserData.email });
      expect(user.walletBalance).toBe(0);
    });

    it('should create user with empty skills and interests arrays', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      const user = await User.findOne({ email: validUserData.email });
      expect(Array.isArray(user.skills)).toBe(true);
      expect(user.skills.length).toBe(0);
      expect(Array.isArray(user.interests)).toBe(true);
      expect(user.interests.length).toBe(0);
    });
  });

  describe('POST /api/auth/login', () => {
    const loginCredentials = {
      email: 'test@example.com',
      password: 'SecurePass123!'
    };

    beforeEach(async () => {
      // Create a user for login tests
      const hashedPassword = await bcrypt.hash(loginCredentials.password, 12);
      await User.create({
        email: loginCredentials.email,
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        firebaseUid: 'firebase-uid-123'
      });
    });

    it('should login user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginCredentials);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(loginCredentials.email);
      expect(response.body).toHaveProperty('token');

      // Verify JWT token is valid
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded.userId).toBeTruthy();
    });

    it('should return error for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'somepassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return error for incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginCredentials.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return error for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: loginCredentials.password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return error for missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginCredentials.email
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should not include password in response', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginCredentials);

      expect(response.status).toBe(200);
      expect(response.body.user.password).toBeUndefined();
    });

    it('should update last login time', async () => {
      const beforeLogin = new Date();
      
      await request(app)
        .post('/api/auth/login')
        .send(loginCredentials);

      const user = await User.findOne({ email: loginCredentials.email });
      expect(user.lastLogin).toBeTruthy();
      expect(new Date(user.lastLogin)).toBeInstanceOf(Date);
      expect(new Date(user.lastLogin)).toBeInstanceOf(Date);
    });
  });

  describe('Token Validation', () => {
    let authToken;
    let userId;

    beforeEach(async () => {
      // Create user and get auth token
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        firebaseUid: 'firebase-uid-123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      authToken = response.body.token;
      userId = response.body.user.id;
    });

    it('should generate valid JWT token on registration', async () => {
      expect(authToken).toBeTruthy();
      
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(userId);
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it('should generate valid JWT token on login', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        });

      const loginToken = loginResponse.body.token;
      expect(loginToken).toBeTruthy();
      
      const decoded = jwt.verify(loginToken, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(userId);
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });
});
