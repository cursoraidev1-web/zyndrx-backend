import { Router } from 'express';
import { inviteMember, acceptInvite, getMembers } from './teams.controller';
import { inviteMemberSchema, acceptInviteSchema } from './teams.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

const router = Router();

// All team routes require you to be logged in
router.use(authenticate);

// POST /api/v1/teams/:project_id/invite
// Example Body: { "email": "dave@example.com", "role": "qa" }
router.post('/:project_id/invite', validate(inviteMemberSchema), inviteMember);

// POST /api/v1/teams/accept
// Example Body: { "token": "abc12345..." }
router.post('/accept', validate(acceptInviteSchema), acceptInvite);

// GET /api/v1/teams/:project_id/members
router.get('/:project_id/members', getMembers);

export default router;