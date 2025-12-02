import { Router, Request, Response } from 'express';
import { CheckoutController } from './CheckoutController';
import { requireAuth } from '../../security/middleware';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'billing-service' });
});

// Protected Routes
router.post('/checkout', requireAuth, CheckoutController.createCheckoutSession);

// Public/Webhook Routes (Mock)
router.post('/webhook/mock-success', CheckoutController.mockPaymentSuccess);

export default router;
