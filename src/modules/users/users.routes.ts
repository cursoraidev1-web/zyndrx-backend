import { Router } from 'express';
import { getUsers, getUser, searchUsers, getUserStats } from './users.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/v1/users/stats - Get user statistics
router.get('/stats', getUserStats);

// GET /api/v1/users/search?q=... - Search users
router.get('/search', searchUsers);

// GET /api/v1/users - List all users in company
router.get('/', getUsers);

// GET /api/v1/users/:id - Get single user
router.get('/:id', getUser);

export default router;
