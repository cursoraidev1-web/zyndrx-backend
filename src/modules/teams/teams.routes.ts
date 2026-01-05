import { Router } from 'express';
import { TeamController } from './teams.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { userRateLimiter } from '../../middleware/rate-limit.middleware';
import { validate } from '../../middleware/validation.middleware';
import { inviteUserSchema, acceptInviteSchema, createTeamSchema, updateTeamSchema, addTeamMemberSchema } from './teams.validation';

const router = Router();
const teamController = new TeamController();

// Teams CRUD
// GET /api/v1/teams - List all teams
router.get('/', authenticate, userRateLimiter, teamController.getTeams);

// POST /api/v1/teams - Create team
router.post('/', authenticate, userRateLimiter, validate(createTeamSchema), teamController.createTeam);

// GET /api/v1/teams/:id - Get single team
router.get('/:id', authenticate, userRateLimiter, teamController.getTeam);

// PATCH /api/v1/teams/:id - Update team
router.patch('/:id', authenticate, userRateLimiter, validate(updateTeamSchema), teamController.updateTeam);

// DELETE /api/v1/teams/:id - Delete team
router.delete('/:id', authenticate, userRateLimiter, teamController.deleteTeam);

// GET /api/v1/teams/:id/members - Get team members
router.get('/:id/members', authenticate, userRateLimiter, teamController.getTeamMembers);

// POST /api/v1/teams/:id/members - Add member to team
router.post('/:id/members', authenticate, userRateLimiter, validate(addTeamMemberSchema), teamController.addTeamMember);

// DELETE /api/v1/teams/:id/members/:userId - Remove member from team
router.delete('/:id/members/:userId', authenticate, userRateLimiter, teamController.removeTeamMember);

// Project invitation endpoints (legacy, keep for backward compatibility)
// POST /api/v1/teams/invite - Invite user to project
router.post(
  '/invite', 
  authenticate, 
  userRateLimiter,
  validate(inviteUserSchema), 
  teamController.inviteMember
);

// POST /api/v1/teams/accept-invite - Accept project invite
router.post(
  '/accept-invite', 
  authenticate, 
  userRateLimiter,
  validate(acceptInviteSchema), 
  teamController.acceptInvite
);

// GET /api/v1/teams/:projectId/members - Get project members (legacy)
router.get(
  '/:projectId/members', 
  authenticate, 
  userRateLimiter,
  teamController.getMembers
);

export default router;