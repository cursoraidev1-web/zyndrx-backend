import { Request, Response, NextFunction } from 'express';
import { PrdService } from './prd.service';
import { ResponseHandler } from '../../utils/response';

export const createPrd = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is guaranteed by the authenticate middleware
    const userId = req.user!.id; 
    
    const prd = await PrdService.createPRD({
      ...req.body,
      created_by: userId
    });

    return ResponseHandler.created(res, prd, 'PRD created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/prds/:id
 * Get a single PRD by ID
 * Requires company context to prevent IDOR vulnerabilities
 */
export const getPrd = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const prd = await PrdService.getPRDById(id, companyId);
    return ResponseHandler.success(res, prd, 'PRD fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/prds?project_id=...
 * Get PRDs for a project or all PRDs
 * Requires company context to prevent IDOR vulnerabilities
 */
export const getPrds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { project_id } = req.query;
    const userId = req.user!.id;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    let prds;
    if (project_id && typeof project_id === 'string') {
      // Get PRDs for a specific project (with company validation)
      prds = await PrdService.getPRDsByProject(project_id, companyId);
    } else {
      // Get all PRDs for company (optionally filtered by user)
      prds = await PrdService.getAllPRDs(userId, companyId);
    }

    return ResponseHandler.success(res, prds, 'PRDs fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/prds/:id
 * Update a PRD
 * Requires company context to prevent IDOR vulnerabilities
 */
export const updatePrd = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const prd = await PrdService.updatePRD(id, { title, content }, companyId);
    return ResponseHandler.success(res, prd, 'PRD updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/prds/:id
 * Delete a PRD
 * Requires company context to prevent IDOR vulnerabilities
 */
export const deletePrd = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    await PrdService.deletePRD(id, companyId);
    return ResponseHandler.success(res, null, 'PRD deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/prds/:id/versions
 * Create a new version of a PRD
 * Requires company context to prevent IDOR vulnerabilities
 */
export const createPrdVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId || req.companyId;
    const { title, content, changes_summary } = req.body;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    // Verify PRD exists and belongs to company
    await PrdService.getPRDById(id, companyId);

    const version = await PrdService.createPRDVersion(id, companyId, {
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

/**
 * GET /api/v1/prds/:id/versions
 * Get all versions of a PRD
 * Requires company context to prevent IDOR vulnerabilities
 */
export const getPrdVersions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    // Verify PRD exists and belongs to company
    await PrdService.getPRDById(id, companyId);

    const versions = await PrdService.getPRDVersions(id);
    return ResponseHandler.success(res, versions, 'PRD versions fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/prds/:id/status
 * Update PRD status (e.g., approve, reject)
 * Requires company context to prevent IDOR vulnerabilities
 */
export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user!.id;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    // Verify PRD exists and belongs to company
    await PrdService.getPRDById(id, companyId);

    const prd = await PrdService.updateStatus(id, status, adminId);
    return ResponseHandler.success(res, prd, `PRD marked as ${status}`);
  } catch (error) {
    next(error);
  }
};

// PRD Sections
export const addPRDSection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId || req.companyId;
    const { title, content, id: sectionId } = req.body;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const prd = await PrdService.addPRDSection(id, companyId, { id: sectionId, title, content });
    return ResponseHandler.success(res, prd, 'Section added successfully');
  } catch (error) {
    next(error);
  }
};

export const updatePRDSection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, sectionId } = req.params;
    const companyId = req.user!.companyId || req.companyId;
    const { title, content } = req.body;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const prdId = Array.isArray(id) ? id[0] : id;
    const secId = Array.isArray(sectionId) ? sectionId[0] : sectionId;
    const prd = await PrdService.updatePRDSection(prdId, companyId, secId, { title, content });
    return ResponseHandler.success(res, prd, 'Section updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deletePRDSection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, sectionId } = req.params;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const prdId = Array.isArray(id) ? id[0] : id;
    const secId = Array.isArray(sectionId) ? sectionId[0] : sectionId;

    const prd = await PrdService.deletePRDSection(prdId, companyId, secId);
    return ResponseHandler.success(res, prd, 'Section deleted successfully');
  } catch (error) {
    next(error);
  }
};

// PRD Assignees
export const addPRDAssignee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId || req.companyId;
    const { userId } = req.body;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    if (!userId) {
      return ResponseHandler.error(res, 'User ID is required', 400);
    }

    const prdId = Array.isArray(id) ? id[0] : id;
    const prd = await PrdService.addPRDAssignee(prdId, companyId, userId);
    return ResponseHandler.success(res, prd, 'Assignee added successfully');
  } catch (error) {
    next(error);
  }
};

export const removePRDAssignee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, userId } = req.params;
    const companyId = req.user!.companyId || req.companyId;
    
    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const prdId = Array.isArray(id) ? id[0] : id;
    const uId = Array.isArray(userId) ? userId[0] : userId;

    const prd = await PrdService.removePRDAssignee(prdId, companyId, uId);
    return ResponseHandler.success(res, prd, 'Assignee removed successfully');
  } catch (error) {
    next(error);
  }
};