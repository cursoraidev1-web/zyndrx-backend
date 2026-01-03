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

// Handoff Comments
export const getHandoffComments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const comments = await HandoffService.getHandoffComments(id, companyId);
    return ResponseHandler.success(res, comments, 'Handoff comments fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const addHandoffComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const { comment } = req.body;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return ResponseHandler.error(res, 'Comment content is required', 400);
    }

    const newComment = await HandoffService.addHandoffComment(id, userId, companyId, comment);
    return ResponseHandler.created(res, newComment, 'Comment added successfully');
  } catch (error) {
    next(error);
  }
};

// Handoff Attachments
export const uploadHandoffAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const { file_name, file_path, file_url, file_type, file_size } = req.body;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    if (!file_name || !file_path || !file_url || !file_type || !file_size) {
      return ResponseHandler.error(res, 'All file metadata fields are required', 400);
    }

    const { HandoffAttachmentService } = await import('./handoff-attachments.service');
    const attachment = await HandoffAttachmentService.saveAttachment(
      id,
      { file_name, file_path, file_url, file_type, file_size },
      userId,
      companyId
    );

    return ResponseHandler.created(res, attachment, 'Attachment uploaded successfully');
  } catch (error) {
    next(error);
  }
};



