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