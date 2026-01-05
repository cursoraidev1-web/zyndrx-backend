import { Router } from 'express';
import { CompanyController } from './companies.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { userRateLimiter } from '../../middleware/rate-limit.middleware';
import { validate } from '../../middleware/validation.middleware';
import { createCompanySchema, inviteUserSchema, updateMemberRoleSchema } from './companies.validation';

const router = Router();
const companyController = new CompanyController();

// All routes require authentication and are rate limited per user
router.use(authenticate);
router.use(userRateLimiter);

/**
 * @route   GET /api/v1/companies/:id
 * @desc    Get company details
 * @access  Private
 */
router.get('/:id', companyController.getCompany);

/**
 * @route   POST /api/v1/companies
 * @desc    Create new company
 * @access  Private
 */
router.post('/', validate(createCompanySchema), companyController.createCompany);

/**
 * @route   GET /api/v1/companies/:id/members
 * @desc    Get company members
 * @access  Private
 */
router.get('/:id/members', companyController.getMembers);

/**
 * @route   POST /api/v1/companies/:id/invite
 * @desc    Invite user to company
 * @access  Private
 */
router.post('/:id/invite', validate(inviteUserSchema), companyController.inviteUser);

/**
 * @route   PATCH /api/v1/companies/:id/members/:userId
 * @desc    Update member role
 * @access  Private
 */
router.patch('/:id/members/:userId', validate(updateMemberRoleSchema), companyController.updateMemberRole);

/**
 * @route   DELETE /api/v1/companies/:id/members/:userId
 * @desc    Remove member from company
 * @access  Private
 */
router.delete('/:id/members/:userId', companyController.removeMember);

export default router;

