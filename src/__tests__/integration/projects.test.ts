import request from 'supertest';
import App from '../../app';

const app = new App().app;

describe('Projects API Integration Tests', () => {
  let authToken: string;
  let companyId: string;

  beforeAll(async () => {
    // Register and login to get token
    const email = `test-${Date.now()}@example.com`;
    const password = 'TestPassword123!@#';

    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        fullName: 'Test User',
        companyName: 'Test Company',
      });

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });

    authToken = loginResponse.body.token;
    companyId = registerResponse.body.currentCompany?.id || registerResponse.body.companies?.[0]?.id;
  });

  describe('POST /api/v1/projects', () => {
    it('should create a project successfully', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Project',
          description: 'Test Description',
          company_id: companyId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('project');
      expect(response.body.project).toHaveProperty('name', 'Test Project');
    });

    it('should reject project creation without authentication', async () => {
      await request(app)
        .post('/api/v1/projects')
        .send({
          name: 'Test Project',
          company_id: companyId,
        })
        .expect(401);
    });

    it('should reject project creation without company_id', async () => {
      await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Project',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should return user projects', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('projects');
      expect(Array.isArray(response.body.projects)).toBe(true);
    });
  });
});
