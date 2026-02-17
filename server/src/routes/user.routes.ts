import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createUserSchema, updateUserSchema } from '../validators/user.validator';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/', userController.listUsers);
router.get('/:id', userController.getUserById);
router.post('/', validate(createUserSchema), userController.createUser);
router.patch('/:id', validate(updateUserSchema), userController.updateUser);
router.delete('/:id', userController.deleteUser);

export default router;
