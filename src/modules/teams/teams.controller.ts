import { Request, Response, NextFunction } from 'express';
import { TeamService } from './teams.service';
import { ResponseHandler } from '../../utils/response';

export const inviteMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { project_id } = req.params;
    const { email, role } = req.body;
    const userId = req.user!.id;

    const result = await TeamService.inviteUser(project_id, email, role, userId);
    return ResponseHandler.created(res, result, 'Invite sent successfully (Check server console for link)');
  } catch (error) { next(error); }
};

export const acceptInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    const userId = req.user!.id;

    const result = await TeamService.acceptInvite(token, userId);
    return ResponseHandler.success(res, result, 'Joined project successfully');
  } catch (error) { next(error); }
};

export const getMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { project_id } = req.params;
    const members = await TeamService.getMembers(project_id);
    return ResponseHandler.success(res, members);
  } catch (error) { next(error); }
};