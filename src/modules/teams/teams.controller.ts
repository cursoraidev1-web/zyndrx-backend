import { Request, Response, NextFunction } from 'express';
import { TeamService } from './teams.service';
import { ResponseHandler } from '../../utils/response';

export class TeamController {
  
  // POST /api/v1/teams/invite
  public inviteMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, email, role } = req.body;
      const userId = req.user!.id;

      if (!projectId) {
        return ResponseHandler.error(res, 'Project ID is required', 400);
      }

      const result = await TeamService.inviteUser(projectId, email, role || 'developer', userId);
      return ResponseHandler.created(res, result, 'Invite sent successfully (Check server console for link)');
    } catch (error) {
      next(error);
    }
  };

  // POST /api/v1/teams/accept
  public acceptInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;
      const userId = req.user!.id;

      const result = await TeamService.acceptInvite(token, userId);
      return ResponseHandler.success(res, result, 'Joined project successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/teams/:project_id/members
  public getMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { project_id } = req.params;
      const members = await TeamService.getMembers(project_id);
      return ResponseHandler.success(res, members);
    } catch (error) {
      next(error);
    }
  };

  // Teams CRUD
  public createTeam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      const { name, description, team_lead_id } = req.body;

      if (!companyId) {
        return ResponseHandler.error(res, 'Company context required', 400);
      }

      const team = await TeamService.createTeam({
        company_id: companyId,
        name,
        description,
        team_lead_id,
        created_by: userId,
      });

      return ResponseHandler.created(res, team, 'Team created successfully');
    } catch (error) {
      next(error);
    }
  };

  public getTeams = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return ResponseHandler.error(res, 'Company context required', 400);
      }

      const teams = await TeamService.getTeams(companyId);
      return ResponseHandler.success(res, teams, 'Teams fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  public getTeam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return ResponseHandler.error(res, 'Company context required', 400);
      }

      const team = await TeamService.getTeamById(id, companyId);
      return ResponseHandler.success(res, team, 'Team fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  public updateTeam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const updates = req.body;

      if (!companyId) {
        return ResponseHandler.error(res, 'Company context required', 400);
      }

      const team = await TeamService.updateTeam(id, companyId, updates);
      return ResponseHandler.success(res, team, 'Team updated successfully');
    } catch (error) {
      next(error);
    }
  };

  public deleteTeam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return ResponseHandler.error(res, 'Company context required', 400);
      }

      await TeamService.deleteTeam(id, companyId);
      return ResponseHandler.success(res, null, 'Team deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  public getTeamMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return ResponseHandler.error(res, 'Company context required', 400);
      }

      const members = await TeamService.getTeamMembers(id, companyId);
      return ResponseHandler.success(res, members, 'Team members fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  public addTeamMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const { user_id, role } = req.body;

      if (!companyId) {
        return ResponseHandler.error(res, 'Company context required', 400);
      }

      const member = await TeamService.addTeamMember(id, companyId, user_id, role);
      return ResponseHandler.created(res, member, 'Member added to team successfully');
    } catch (error) {
      next(error);
    }
  };

  public removeTeamMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, userId } = req.params;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return ResponseHandler.error(res, 'Company context required', 400);
      }

      await TeamService.removeTeamMember(id, companyId, userId);
      return ResponseHandler.success(res, null, 'Member removed from team successfully');
    } catch (error) {
      next(error);
    }
  };
}