import { Router, Request, Response } from 'express';
import { requireAuth } from '../../security/middleware';
import { upload } from './middleware/uploadMiddleware';
import {
    createSubject,
    getSubjects,
    getSubjectById,
    updateSubject,
    deleteSubject
} from './controllers/SubjectController';

const router = Router();

// Health check
router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'subject-registry-service' });
});

// CRUD routes - all protected by auth
router.post('/', requireAuth, upload.array('images', 5), createSubject);
router.get('/', requireAuth, getSubjects);
router.get('/:id', requireAuth, getSubjectById);
router.put('/:id', requireAuth, updateSubject);
router.delete('/:id', requireAuth, deleteSubject);

export default router;

