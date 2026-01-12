import { TaskService } from '../tasks.service';
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

describe('TaskService', () => {
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

  describe('createTask', () => {
    const mockTaskData = {
      project_id: 'project-123',
      company_id: 'company-123',
      title: 'Test Task',
      description: 'Test Description',
      created_by: 'user-123',
      status: 'todo' as const,
      priority: 'medium' as const,
    };

    it('should create a task successfully', async () => {
      (SubscriptionService.checkLimit as jest.Mock).mockResolvedValue({ allowed: true });

      const mockTask = {
        id: 'task-123',
        ...mockTaskData,
        created_at: new Date().toISOString(),
      };

      mockSupabase.from('tasks').insert.mockResolvedValue({
        data: [mockTask],
        error: null,
      });

      mockSupabase.from('projects').select.mockResolvedValue({
        data: { name: 'Test Project', company_id: 'company-123' },
        error: null,
      });

      const result = await TaskService.createTask(mockTaskData, 'user-123', 'company-123');

      expect(result).toHaveProperty('id');
      expect(result.title).toBe(mockTaskData.title);
      expect(SubscriptionService.checkLimit).toHaveBeenCalledWith('company-123', 'task');
    });

    it('should throw error if company ID is missing', async () => {
      const invalidData = { ...mockTaskData };
      delete (invalidData as any).company_id;

      await expect(TaskService.createTask(invalidData, 'user-123', 'company-123')).rejects.toThrow(AppError);
    });

    it('should throw error if subscription limit reached', async () => {
      (SubscriptionService.checkLimit as jest.Mock).mockResolvedValue({
        allowed: false,
        message: 'Task limit reached',
      });

      await expect(TaskService.createTask(mockTaskData, 'user-123', 'company-123')).rejects.toThrow(AppError);
    });
  });

  describe('getTaskById', () => {
    it('should return task by ID', async () => {
      const taskId = 'task-123';
      const companyId = 'company-123';

      const mockTask = {
        id: taskId,
        title: 'Test Task',
        company_id: companyId,
      };

      mockSupabase.from('tasks').select.mockResolvedValue({
        data: [mockTask],
        error: null,
      });

      const result = await TaskService.getTaskById(taskId, companyId);

      expect(result).toHaveProperty('id', taskId);
      expect(result).toHaveProperty('title');
    });

    it('should throw error if task not found', async () => {
      const taskId = 'non-existent';
      const companyId = 'company-123';

      mockSupabase.from('tasks').select.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      await expect(TaskService.getTaskById(taskId, companyId)).rejects.toThrow(AppError);
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const taskId = 'task-123';
      const companyId = 'company-123';
      const updates = { title: 'Updated Title', status: 'in_progress' as const };

      const mockUpdatedTask = {
        id: taskId,
        ...updates,
        company_id: companyId,
      };

      mockSupabase.from('tasks').update.mockResolvedValue({
        data: [mockUpdatedTask],
        error: null,
      });

      const result = await TaskService.updateTask(taskId, updates, companyId);

      expect(result).toHaveProperty('title', 'Updated Title');
      expect(result).toHaveProperty('status', 'in_progress');
    });
  });
});
