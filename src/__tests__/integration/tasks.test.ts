import request from 'supertest';
import App from '../../app';

const app = new App().app;

describe('Tasks API Integration Tests', () => {
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

  describe('POST /api/v1/tasks', () => {
    it('should create a task successfully', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          project_id: projectId,
          company_id: companyId,
          title: 'Test Task',
          description: 'Test Description',
          status: 'todo',
          priority: 'medium',
        })
        .expect(201);

      expect(response.body).toHaveProperty('task');
      expect(response.body.task).toHaveProperty('title', 'Test Task');
    });

    it('should reject task creation without authentication', async () => {
      await request(app)
        .post('/api/v1/tasks')
        .send({
          project_id: projectId,
          title: 'Test Task',
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('should return tasks for a project', async () => {
      const response = await request(app)
        .get(`/api/v1/tasks?project_id=${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tasks');
      expect(Array.isArray(response.body.tasks)).toBe(true);
    });
  });
});
