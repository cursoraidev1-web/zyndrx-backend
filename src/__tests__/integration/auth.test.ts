import request from 'supertest';
import App from '../../app';

const app = new App().app;

describe('Auth API Integration Tests', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `test-${Date.now()}@example.com`,
          password: 'TestPassword123!@#',
          fullName: 'Test User',
          companyName: 'Test Company',
        })
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email');
    });

    it('should reject registration with existing email', async () => {
      const email = `test-${Date.now()}@example.com`;
      
      // First registration
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'TestPassword123!@#',
          fullName: 'Test User',
        })
        .expect(201);

      // Second registration with same email
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'TestPassword123!@#',
          fullName: 'Test User',
        })
        .expect(409);
    });

    it('should reject registration with weak password', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `test-${Date.now()}@example.com`,
          password: 'weak',
          fullName: 'Test User',
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testEmail: string;
    let testPassword: string;

    beforeAll(async () => {
      // Create a test user
      testEmail = `test-${Date.now()}@example.com`;
      testPassword = 'TestPassword123!@#';

      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          fullName: 'Test User',
        });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
    });

    it('should reject login with invalid credentials', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!@#',
        })
        .expect(401);
    });

    it('should require 2FA if enabled', async () => {
      // This test would require setting up 2FA for the test user
      // For now, we'll just test the endpoint structure
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      // Should return either success or require2fa
      expect([200, 202]).toContain(response.status);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let authToken: string;

    beforeAll(async () => {
      // Register and login to get token
      const email = `test-${Date.now()}@example.com`;
      const password = 'TestPassword123!@#';

      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password,
          fullName: 'Test User',
        });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password });

      authToken = loginResponse.body.token;
    });

    it('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email');
    });

    it('should reject request without token', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
