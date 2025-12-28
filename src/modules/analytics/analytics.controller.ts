import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { ResponseHandler } from '../../utils/response';

export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { project_id } = req.query;
    const companyId = req.user!.companyId;

    if (!project_id) {
      return ResponseHandler.error(res, 'Project ID required', 400);
    }

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const stats = await AnalyticsService.getProjectStats(String(project_id), companyId);
    return ResponseHandler.success(res, stats, 'Analytics fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const getKPIs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { project_id } = req.query;
    const companyId = req.user!.companyId;

    if (!project_id || !companyId) {
      return ResponseHandler.error(res, 'Project ID and company context required', 400);
    }

    const kpis = await AnalyticsService.getKPIs(String(project_id), companyId);
    return ResponseHandler.success(res, kpis, 'KPIs fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const getProjectProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { project_id } = req.query;
    const companyId = req.user!.companyId;

    if (!project_id || !companyId) {
      return ResponseHandler.error(res, 'Project ID and company context required', 400);
    }

    const progress = await AnalyticsService.getProjectProgress(String(project_id), companyId);
    return ResponseHandler.success(res, progress, 'Project progress fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const getTeamPerformance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { project_id } = req.query;
    const companyId = req.user!.companyId;

    if (!project_id || !companyId) {
      return ResponseHandler.error(res, 'Project ID and company context required', 400);
    }

    const performance = await AnalyticsService.getTeamPerformance(String(project_id), companyId);
    return ResponseHandler.success(res, performance, 'Team performance fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const getTaskAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { project_id } = req.query;
    const companyId = req.user!.companyId;

    if (!project_id || !companyId) {
      return ResponseHandler.error(res, 'Project ID and company context required', 400);
    }

    const analytics = await AnalyticsService.getTaskAnalytics(String(project_id), companyId);
    return ResponseHandler.success(res, analytics, 'Task analytics fetched successfully');
  } catch (error) {
    next(error);
  }
};