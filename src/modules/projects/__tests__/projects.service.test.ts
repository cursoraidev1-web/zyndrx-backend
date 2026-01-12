import { ProjectService } from '../projects.service';
import { supabaseAdmin } from '../../../config/supabase';
import { AppError } from '../../../middleware/error.middleware';
import { SubscriptionService } from '../../subscriptions/subscriptions.service';

jest.mock('../../../config/supabase');
jest.mock('../../subscriptions/subscriptions.service');
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('ProjectService', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
    };
    (supabaseAdmin as any) = mockSupabase;
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    const mockProjectData = {
      name: 'Test Project',
      description: 'Test Description',
      company_id: 'company-123',
      owner_id: 'user-123',
    };

    it('should create a project successfully', async () => {
      (SubscriptionService.checkLimit as jest.Mock).mockResolvedValue({ allowed: true });

      const mockProject = {
        id: 'project-123',
        ...mockProjectData,
        created_at: new Date().toISOString(),
        progress: 0,
      };

      mockSupabase.from('projects').insert.mockResolvedValue({
        data: [mockProject],
        error: null,
      });

      const result = await ProjectService.createProject(mockProjectData);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe(mockProjectData.name);
      expect(SubscriptionService.checkLimit).toHaveBeenCalledWith('company-123', 'project');
    });

    it('should throw error if company ID is missing', async () => {
      const invalidData = { ...mockProjectData };
      delete (invalidData as any).company_id;

      await expect(ProjectService.createProject(invalidData)).rejects.toThrow(AppError);
    });

    it('should throw error if subscription limit reached', async () => {
      (SubscriptionService.checkLimit as jest.Mock).mockResolvedValue({
        allowed: false,
        message: 'Project limit reached',
      });

      await expect(ProjectService.createProject(mockProjectData)).rejects.toThrow(AppError);
    });
  });

  describe('getUserProjects', () => {
    it('should return projects with progress', async () => {
      const userId = 'user-123';
      const companyId = 'company-123';

      const mockProjects = [
        { id: 'project-1', name: 'Project 1', company_id: companyId },
        { id: 'project-2', name: 'Project 2', company_id: companyId },
      ];

      mockSupabase.from('user_companies').select.mockResolvedValue({
        data: [{ company_id: companyId }],
        error: null,
      });

      mockSupabase.from('projects').select.mockResolvedValue({
        data: mockProjects,
        error: null,
      });

      mockSupabase.from('tasks').select.mockResolvedValue({
        data: [
          { project_id: 'project-1', status: 'completed' },
          { project_id: 'project-1', status: 'todo' },
          { project_id: 'project-2', status: 'completed' },
        ],
        error: null,
      });

      const result = await ProjectService.getUserProjects(userId, companyId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('calculateProjectProgress', () => {
    it('should calculate progress correctly', async () => {
      const projectId = 'project-123';
      const companyId = 'company-123';

      mockSupabase.from('tasks').select.mockResolvedValue({
        data: [
          { status: 'completed' },
          { status: 'completed' },
          { status: 'todo' },
          { status: 'in_progress' },
        ],
        error: null,
      });

      // Access private method via reflection or test public method that uses it
      const project = await ProjectService.getProjectById(projectId, companyId);
      
      // Progress should be calculated and included
      expect(project).toHaveProperty('progress');
    });

    it('should return 0 progress for projects with no tasks', async () => {
      const projectId = 'project-123';
      const companyId = 'company-123';

      mockSupabase.from('tasks').select.mockResolvedValue({
        data: [],
        error: null,
      });

      const project = await ProjectService.getProjectById(projectId, companyId);
      expect(project?.progress).toBe(0);
    });
  });
});
