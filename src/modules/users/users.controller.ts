import { Request, Response, NextFunction } from 'express';
import { UserService } from './users.service';
import { ResponseHandler } from '../../utils/response';

/**
 * Get all users in company
 * GET /api/v1/users
 */
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const users = await UserService.getCompanyUsers(companyId);
    return ResponseHandler.success(res, users, 'Users fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single user by ID
 * GET /api/v1/users/:id
 */
export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const user = await UserService.getUserById(id, companyId);
    return ResponseHandler.success(res, user, 'User fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Search users in company
 * GET /api/v1/users/search?q=...
 */
export const searchUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    if (!q || typeof q !== 'string') {
      return ResponseHandler.error(res, 'Search query is required', 400);
    }

    const users = await UserService.searchUsers(companyId, q);
    return ResponseHandler.success(res, users, 'Users search completed');
  } catch (error) {
    next(error);
  }
};

/**
 * Get user statistics
 * GET /api/v1/users/stats
 */
export const getUserStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const stats = await UserService.getUserStats(companyId);
    return ResponseHandler.success(res, stats, 'User statistics fetched successfully');
  } catch (error) {
    next(error);
  }
};
