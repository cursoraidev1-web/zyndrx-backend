import { Request, Response, NextFunction } from 'express';
import { PrdService } from './prd.service';
import { ResponseHandler } from '../../utils/response';

export const createPrd = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is guaranteed by the authenticate middleware
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }
    
    const prd = await PrdService.createPRD({
      ...req.body,
      created_by: userId,
      company_id: companyId
    });

    return ResponseHandler.created(res, prd, 'PRD created successfully');
  } catch (error) {
    next(error);
  }
};

export const getPrd = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const prd = await PrdService.getPRDById(id);
    
    if (!prd) {
      return ResponseHandler.notFound(res, 'PRD not found');
    }

    return ResponseHandler.success(res, prd, 'PRD fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const getPrds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { project_id } = req.query;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    let prds;
    if (project_id && typeof project_id === 'string') {
      // Get PRDs for a specific project
      prds = await PrdService.getPRDsByProject(project_id);
    } else {
      // Get all PRDs (optionally filtered by user)
      prds = await PrdService.getAllPRDs(companyId, userId);
    }

    return ResponseHandler.success(res, prds, 'PRDs fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const updatePrd = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const prd = await PrdService.updatePRD(id, { title, content });
    return ResponseHandler.success(res, prd, 'PRD updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deletePrd = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await PrdService.deletePRD(id);
    return ResponseHandler.success(res, null, 'PRD deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const createPrdVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { title, content, changes_summary } = req.body;

    const version = await PrdService.createPRDVersion(id, {
      title,
      content,
      created_by: userId,
      changes_summary
    });

    return ResponseHandler.created(res, version, 'PRD version created successfully');
  } catch (error) {
    next(error);
  }
};

export const getPrdVersions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const versions = await PrdService.getPRDVersions(id);
    return ResponseHandler.success(res, versions, 'PRD versions fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user!.id; 

    const prd = await PrdService.updateStatus(id, status, adminId);
    return ResponseHandler.success(res, prd, `PRD marked as ${status}`);
  } catch (error) {
    next(error);
  }
};