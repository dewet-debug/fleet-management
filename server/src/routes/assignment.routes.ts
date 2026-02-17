import { Router } from 'express';
import * as assignmentController from '../controllers/assignment.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createAssignmentSchema } from '../validators/assignment.validator';

const router = Router();

router.use(authenticate);

router.get('/', assignmentController.listAssignments);
router.post('/', authorize('ADMIN', 'FLEET_MANAGER'), validate(createAssignmentSchema), assignmentController.createAssignment);
router.patch('/:id/end', authorize('ADMIN', 'FLEET_MANAGER'), assignmentController.endAssignment);

export default router;
