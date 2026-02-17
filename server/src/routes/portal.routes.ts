import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../middleware/auth';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as serviceService from '../services/service.service';

const router = Router();

router.use(authenticate);
router.use(authorize('SERVICE_COMPANY'));

router.get('/services', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await serviceService.listServiceRecords(req.query);
    res.json(result);
  } catch (error) { next(error); }
});

router.get('/services/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await serviceService.getServiceRecordById(req.params.id);
    res.json(result);
  } catch (error) { next(error); }
});

router.patch('/services/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { technicianNotes } = req.body;
    const result = await serviceService.updateServiceRecord(
      req.params.id,
      { technicianNotes },
      (req as RequestWithUser).user.id
    );
    res.json(result);
  } catch (error) { next(error); }
});

router.post('/services/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await serviceService.transitionServiceRecord(
      req.params.id, 'COMPLETE', (req as RequestWithUser).user.id, req.body.notes
    );
    res.json(result);
  } catch (error) { next(error); }
});

export default router;
