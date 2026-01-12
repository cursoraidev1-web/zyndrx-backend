import { CompanyService } from '../companies.service';
import { supabaseAdmin } from '../../../config/supabase';
import { AppError } from '../../../middleware/error.middleware';

jest.mock('../../../config/supabase');
jest.mock('../../../utils/email.service');
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('CompanyService', () => {
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

  describe('createCompany', () => {
    const mockCompanyData = {
      name: 'Test Company',
      userId: 'user-123',
    };

    it('should create a company successfully', async () => {
      const mockCompany = {
        id: 'company-123',
        name: mockCompanyData.name,
        slug: 'test-company',
        created_at: new Date().toISOString(),
      };

      mockSupabase.from('companies').insert.mockResolvedValue({
        data: [mockCompany],
        error: null,
      });

      mockSupabase.from('user_companies').insert.mockResolvedValue({
        data: [{ user_id: mockCompanyData.userId, company_id: mockCompany.id }],
        error: null,
      });

      const result = await CompanyService.createCompany(mockCompanyData);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe(mockCompanyData.name);
    });

    it('should throw error if company name is empty', async () => {
      const invalidData = { ...mockCompanyData, name: '' };

      await expect(CompanyService.createCompany(invalidData)).rejects.toThrow(AppError);
    });
  });

  describe('getUserCompanies', () => {
    it('should return user companies', async () => {
      const userId = 'user-123';

      const mockCompanies = [
        { id: 'company-1', name: 'Company 1', role: 'admin' },
        { id: 'company-2', name: 'Company 2', role: 'member' },
      ];

      mockSupabase.from('user_companies').select.mockResolvedValue({
        data: mockCompanies,
        error: null,
      });

      const result = await CompanyService.getUserCompanies(userId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('inviteUser', () => {
    it('should create invitation successfully', async () => {
      const companyId = 'company-123';
      const email = 'invitee@example.com';
      const role = 'member';
      const inviterId = 'user-123';

      const mockInvite = {
        id: 'invite-123',
        company_id: companyId,
        email,
        role,
        token: 'mock-token',
      };

      mockSupabase.from('company_invites').insert.mockResolvedValue({
        data: [mockInvite],
        error: null,
      });

      const result = await CompanyService.inviteUser(companyId, email, role, inviterId);

      expect(result).toHaveProperty('invite');
      expect(result.invite.email).toBe(email);
    });
  });
});
