import { Request, Response, NextFunction } from 'express';
import { CompanyService } from './companies.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';

export class CompanyController {
  /**
   * Get user's companies
   * GET /api/v1/auth/companies
   */
  getMyCompanies = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const companies = await CompanyService.getUserCompanies(userId);
    return ResponseHandler.success(res, companies);
  });

  /**
   * Get company details
   * GET /api/v1/companies/:id
   */
  getCompany = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const company = await CompanyService.getCompanyById(id, userId);
    return ResponseHandler.success(res, company);
  });

  /**
   * Create company
   * POST /api/v1/companies
   */
  createCompany = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ResponseHandler.error(res, 'Company name is required', 400);
    }

    const company = await CompanyService.createCompany({
      name: name.trim(),
      description: description?.trim() || undefined,
      userId,
    });

    return ResponseHandler.created(res, company, 'Company created successfully');
  });

  /**
   * Get company members
   * GET /api/v1/companies/:id/members
   */
  getMembers = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const members = await CompanyService.getCompanyMembers(id, userId);
    return ResponseHandler.success(res, members);
  });

  /**
   * Invite user to company
   * POST /api/v1/companies/:id/invite
   */
  inviteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { email, role } = req.body;
    const userId = req.user!.id;

    if (!email || typeof email !== 'string') {
      return ResponseHandler.error(res, 'Email is required', 400);
    }

    const result = await CompanyService.inviteUser(id, email, role || 'member', userId);
    return ResponseHandler.created(res, result, 'User invited successfully');
  });

  /**
   * Update member role
   * PATCH /api/v1/companies/:id/members/:userId
   */
  updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
    const { id, userId: memberUserId } = req.params;
    const { role } = req.body;
    const updaterId = req.user!.id;

    if (!role || typeof role !== 'string') {
      return ResponseHandler.error(res, 'Role is required', 400);
    }

    const validRoles = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return ResponseHandler.error(res, `Role must be one of: ${validRoles.join(', ')}`, 400);
    }

    const result = await CompanyService.updateMemberRole(id, memberUserId, role, updaterId);
    return ResponseHandler.success(res, result, 'Member role updated successfully');
  });

  /**
   * Remove member from company
   * DELETE /api/v1/companies/:id/members/:userId
   */
  removeMember = asyncHandler(async (req: Request, res: Response) => {
    const { id, userId: memberUserId } = req.params;
    const removerId = req.user!.id;

    await CompanyService.removeMember(id, memberUserId, removerId);
    return ResponseHandler.success(res, null, 'Member removed successfully');
  });

  /**
   * Switch active company
   * POST /api/v1/auth/switch-company
   */
  switchCompany = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { company_id } = req.body;

    if (!company_id || typeof company_id !== 'string') {
      return ResponseHandler.error(res, 'Company ID is required', 400);
    }

    const result = await CompanyService.switchCompany(company_id, userId);
    
    // Generate new token with updated companyId
    const { AuthService } = await import('../auth/auth.service');
    const authService = new AuthService();
    const user = await authService.getCurrentUser(userId);
    const token = await authService.generateTokenForCompany(userId, company_id);
    
    // Get all user's companies for response
    const companies = await CompanyService.getUserCompanies(userId);
    
    return ResponseHandler.success(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      company: result.company,
      companyId: result.company.id,
      userRole: result.userRole,
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
      })),
      currentCompany: {
        id: result.company.id,
        name: result.company.name,
      },
    }, 'Company switched successfully');
  });
}

