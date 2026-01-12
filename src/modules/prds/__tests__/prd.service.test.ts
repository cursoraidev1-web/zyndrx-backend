import { PrdService } from '../prd.service';
import { supabaseAdmin } from '../../../config/supabase';
import { AppError } from '../../../middleware/error.middleware';

jest.mock('../../../config/supabase');
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('PrdService', () => {
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

  describe('createPRD', () => {
    const mockPRDData = {
      project_id: 'project-123',
      company_id: 'company-123',
      title: 'Test PRD',
      content: { sections: [] },
      created_by: 'user-123',
    };

    it('should create a PRD successfully', async () => {
      const mockPRD = {
        id: 'prd-123',
        ...mockPRDData,
        version: 1,
        status: 'draft',
        created_at: new Date().toISOString(),
      };

      mockSupabase.from('prds').insert.mockResolvedValue({
        data: [mockPRD],
        error: null,
      });

      const result = await PrdService.createPRD(mockPRDData);

      expect(result).toHaveProperty('id');
      expect(result.title).toBe(mockPRDData.title);
    });

    it('should throw error if company ID is missing', async () => {
      const invalidData = { ...mockPRDData };
      delete (invalidData as any).company_id;

      await expect(PrdService.createPRD(invalidData)).rejects.toThrow();
    });
  });

  describe('getPRDById', () => {
    it('should return PRD by ID', async () => {
      const prdId = 'prd-123';
      const companyId = 'company-123';

      const mockPRD = {
        id: prdId,
        title: 'Test PRD',
        company_id: companyId,
        content: { sections: [] },
      };

      mockSupabase.from('prds').select.mockResolvedValue({
        data: [mockPRD],
        error: null,
      });

      const result = await PrdService.getPRDById(prdId, companyId);

      expect(result).toHaveProperty('id', prdId);
      expect(result).toHaveProperty('title');
    });
  });

  describe('updatePRD', () => {
    it('should update PRD successfully', async () => {
      const prdId = 'prd-123';
      const companyId = 'company-123';
      const updates = { title: 'Updated PRD', content: { sections: [{ id: '1', title: 'Section 1' }] } };

      const mockUpdatedPRD = {
        id: prdId,
        ...updates,
        company_id: companyId,
      };

      mockSupabase.from('prds').update.mockResolvedValue({
        data: [mockUpdatedPRD],
        error: null,
      });

      const result = await PrdService.updatePRD(prdId, updates, companyId);

      expect(result).toHaveProperty('title', 'Updated PRD');
    });
  });
});
