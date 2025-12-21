import { Router } from 'express';
import { TeamController } from './teams.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { inviteUserSchema, acceptInviteSchema } from './teams.validation';

const router = Router();
const teamController = new TeamController();

// 1. Invite a member
// Route: POST /api/v1/teams/invite
// Body: { "projectId": "...", "email": "...", "role": "..." }
router.post(
  '/invite', 
  authenticate, 
  validate(inviteUserSchema), 
  teamController.inviteMember
);

// 2. Accept an invite
// Route: POST /api/v1/teams/accept-invite
// Body: { "token": "..." }
router.post(
  '/accept-invite', 
  authenticate, 
  validate(acceptInviteSchema), 
  teamController.acceptInvite
);

// 3. Get all members of a project
// Route: GET /api/v1/teams/:projectId/members
router.get(
  '/:projectId/members', 
  authenticate, 
  teamController.getMembers
);

export default router;