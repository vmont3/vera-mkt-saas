import { Router, Request, Response } from 'express';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'identity-service' });
});

export default router;
