import { Request, Response, NextFunction } from 'express';
import { TaskAttachmentService } from './task-attachments.service';
import { ResponseHandler } from '../../utils/response';

export const requestUploadToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const { task_id, file_name, file_size, file_type } = req.body;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const tokenData = await TaskAttachmentService.generateUploadToken(
      task_id,
      file_name,
      file_size,
      file_type,
      userId,
      companyId
    );

    return ResponseHandler.success(res, tokenData, 'Upload token generated');
  } catch (error) {
    next(error);
  }
};

export const saveAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const { task_id, project_id, file_name, file_path, file_url, file_type, file_size } = req.body;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const attachment = await TaskAttachmentService.saveAttachment({
      task_id,
      project_id,
      file_name,
      file_path,
      file_url,
      file_type,
      file_size,
      uploaded_by: userId,
      company_id: companyId,
    });

    return ResponseHandler.created(res, attachment, 'Attachment saved successfully');
  } catch (error) {
    next(error);
  }
};

export const getTaskAttachments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const attachments = await TaskAttachmentService.getTaskAttachments(taskId);
    return ResponseHandler.success(res, attachments, 'Attachments fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const getAttachmentDownloadUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const downloadData = await TaskAttachmentService.generateDownloadUrl(id, companyId);
    return ResponseHandler.success(res, downloadData, 'Download URL generated');
  } catch (error) {
    next(error);
  }
};

export const deleteAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    await TaskAttachmentService.deleteAttachment(id, userId, companyId);
    return ResponseHandler.success(res, null, 'Attachment deleted successfully');
  } catch (error) {
    next(error);
  }
};


