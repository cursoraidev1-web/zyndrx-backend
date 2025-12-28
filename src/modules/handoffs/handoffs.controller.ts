import { Request, Response, NextFunction } from 'express';
import { HandoffService } from './handoffs.service';
import { ResponseHandler } from '../../utils/response';

export const createHandoff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const { project_id, to_user_id, title, description, priority, due_date } = req.body;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const handoff = await HandoffService.createHandoff({
      project_id,
      from_user_id: userId,
      to_user_id,
      title,
      description,
      priority,
      due_date,
      company_id: companyId,
    });

    return ResponseHandler.created(res, handoff, 'Handoff created successfully');
  } catch (error) {
    next(error);
  }
};

export const getHandoff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const handoff = await HandoffService.getHandoffById(id, companyId);
    return ResponseHandler.success(res, handoff, 'Handoff fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const getHandoffs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId;
    const { project_id, status, user_id, from_user_id, to_user_id } = req.query;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const handoffs = await HandoffService.getHandoffs({
      companyId,
      projectId: project_id as string | undefined,
      status: status as string | undefined,
      userId: user_id as string | undefined,
      fromUserId: from_user_id as string | undefined,
      toUserId: to_user_id as string | undefined,
    });

    return ResponseHandler.success(res, handoffs, 'Handoffs fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const updateHandoff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const updates = req.body;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const handoff = await HandoffService.updateHandoff(id, companyId, updates);
    return ResponseHandler.success(res, handoff, 'Handoff updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteHandoff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    await HandoffService.deleteHandoff(id, companyId);
    return ResponseHandler.success(res, null, 'Handoff deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const approveHandoff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const approverId = req.user!.id;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const handoff = await HandoffService.approveHandoff(id, approverId, companyId);
    return ResponseHandler.success(res, handoff, 'Handoff approved successfully');
  } catch (error) {
    next(error);
  }
};

export const rejectHandoff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const rejectorId = req.user!.id;
    const companyId = req.user!.companyId;
    const { reason } = req.body;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const handoff = await HandoffService.rejectHandoff(id, rejectorId, companyId, reason);
    return ResponseHandler.success(res, handoff, 'Handoff rejected successfully');
  } catch (error) {
    next(error);
  }
};

