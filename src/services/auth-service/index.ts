import { Router, Request, Response } from 'express';
import routes from './routes';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'auth-service' });
});

router.use('/', routes);

export default router;
