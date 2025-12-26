import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';
import { ResponseHandler } from '../utils/response';
import { CompanyService } from '../modules/companies/companies.service';

/**
 * Middleware to verify user is member of company from JWT
 * Ensures all requests are scoped to the user's current company
 */
export const verifyCompanyAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const companyId = req.user.companyId;

    if (!companyId) {
      return ResponseHandler.error(
        res,
        'No company context. Please select a company or workspace.',
        400
      );
    }

    // Verify user is member of company
    const isMember = await CompanyService.verifyMembership(companyId, req.user.id);

    if (!isMember) {
      return ResponseHandler.forbidden(
        res,
        'Access denied. You are not a member of this company.'
      );
    }

    // Attach companyId to request for use in services
    req.companyId = companyId;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to optionally verify company access
 * Use when company_id is in request body/params instead of JWT
 */
export const verifyCompanyAccessFromRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    // Get company_id from body, params, or query
    const companyId =
      req.body.company_id || req.params.company_id || req.query.company_id;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company ID is required', 400);
    }

    // Verify user is member of company
    const isMember = await CompanyService.verifyMembership(companyId, req.user.id);

    if (!isMember) {
      return ResponseHandler.forbidden(
        res,
        'Access denied. You are not a member of this company.'
      );
    }

    // Attach companyId to request
    req.companyId = companyId;

    next();
  } catch (error) {
    next(error);
  }
};

// Extend Express Request type to include companyId
declare global {
  namespace Express {
    interface Request {
      companyId?: string;
    }
  }
}



