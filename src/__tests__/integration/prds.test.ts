import request from 'supertest';
import App from '../../app';

const app = new App().app;

describe('PRDs API Integration Tests', () => {
  let authToken: string;
  let companyId: string;
  let projectId: string;

  beforeAll(async () => {
    // Register and login
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

    // Create a project
    const projectResponse = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Project',
        company_id: companyId,
      });

    projectId = projectResponse.body.project?.id;
  });

  describe('POST /api/v1/prds', () => {
    it('should create a PRD successfully', async () => {
      const response = await request(app)
        .post('/api/v1/prds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          project_id: projectId,
          title: 'Test PRD',
          content: {
            sections: [
              { id: '1', title: 'Overview', content: 'Test content' },
            ],
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('prd');
      expect(response.body.prd).toHaveProperty('title', 'Test PRD');
    });

    it('should reject PRD creation without authentication', async () => {
      await request(app)
        .post('/api/v1/prds')
        .send({
          project_id: projectId,
          title: 'Test PRD',
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/prds', () => {
    it('should return PRDs for a project', async () => {
      const response = await request(app)
        .get(`/api/v1/prds?project_id=${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('prds');
      expect(Array.isArray(response.body.prds)).toBe(true);
    });
  });
});
