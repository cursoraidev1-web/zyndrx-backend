import { SubscriptionService } from '../subscriptions.service';
import { supabaseAdmin } from '../../../config/supabase';
import { AppError } from '../../../middleware/error.middleware';

jest.mock('../../../config/supabase');
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('SubscriptionService', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
    };
    (supabaseAdmin as any) = mockSupabase;
    jest.clearAllMocks();
  });

  describe('getCompanySubscription', () => {
    it('should return subscription for company', async () => {
      const companyId = 'company-123';

      const mockSubscription = {
        id: 'sub-123',
        company_id: companyId,
        plan_type: 'free',
        status: 'active',
      };

      mockSupabase.from('subscriptions').select.mockResolvedValue({
        data: [mockSubscription],
        error: null,
      });

      const result = await SubscriptionService.getCompanySubscription(companyId);

      expect(result).toHaveProperty('planType', 'free');
      expect(result).toHaveProperty('status', 'active');
    });

    it('should return null if subscription not found', async () => {
      const companyId = 'company-123';

      mockSupabase.from('subscriptions').select.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await SubscriptionService.getCompanySubscription(companyId);

      expect(result).toBeNull();
    });
  });

  describe('checkLimit', () => {
    it('should allow resource creation if under limit', async () => {
      const companyId = 'company-123';

      const mockSubscription = {
        plan_type: 'free',
        status: 'active',
      };

      mockSupabase.from('subscriptions').select.mockResolvedValue({
        data: [mockSubscription],
        error: null,
      });

      mockSupabase.from('plan_limits').select.mockResolvedValue({
        data: [{ plan_type: 'free', max_projects: 3 }],
        error: null,
      });

      mockSupabase.from('projects').select.mockResolvedValue({
        data: [{ id: 'project-1' }, { id: 'project-2' }],
        error: null,
      });

      const result = await SubscriptionService.checkLimit(companyId, 'project');

      expect(result.allowed).toBe(true);
    });

    it('should deny resource creation if limit reached', async () => {
      const companyId = 'company-123';

      const mockSubscription = {
        plan_type: 'free',
        status: 'active',
      };

      mockSupabase.from('subscriptions').select.mockResolvedValue({
        data: [mockSubscription],
        error: null,
      });

      mockSupabase.from('plan_limits').select.mockResolvedValue({
        data: [{ plan_type: 'free', max_projects: 3 }],
        error: null,
      });

      mockSupabase.from('projects').select.mockResolvedValue({
        data: [
          { id: 'project-1' },
          { id: 'project-2' },
          { id: 'project-3' },
        ],
        error: null,
      });

      const result = await SubscriptionService.checkLimit(companyId, 'project');

      expect(result.allowed).toBe(false);
    });
  });

  describe('getCompanyUsage', () => {
    it('should return usage statistics', async () => {
      const companyId = 'company-123';

      mockSupabase.from('projects').select.mockResolvedValue({
        data: [{ id: 'project-1' }],
        error: null,
      });

      mockSupabase.from('tasks').select.mockResolvedValue({
        data: [{ id: 'task-1' }, { id: 'task-2' }],
        error: null,
      });

      mockSupabase.from('user_companies').select.mockResolvedValue({
        data: [{ user_id: 'user-1' }, { user_id: 'user-2' }],
        error: null,
      });

      const result = await SubscriptionService.getCompanyUsage(companyId);

      expect(result).toHaveProperty('projects');
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('teamMembers');
    });
  });
});
