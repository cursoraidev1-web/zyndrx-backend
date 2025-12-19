import { Router } from 'express';
import { createProject, getMyProjects, getProjectDetails } from './projects.controller';
import { createProjectSchema } from './projects.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware'; // Assuming you have this

const router = Router();

// Apply Auth to all project routes
router.use(authenticate);

// POST /api/v1/projects - Create
router.post('/', validate(createProjectSchema), createProject);

// GET /api/v1/projects - List My Projects
router.get('/', getMyProjects);

// GET /api/v1/projects/:id - Details
router.get('/:id', getProjectDetails);

export default router;