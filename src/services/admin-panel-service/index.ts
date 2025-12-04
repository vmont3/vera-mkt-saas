import { Router, Request, Response } from 'express';
import { AdminCommissionController } from './AdminCommissionController';
import { requireAuth } from '../../security/middleware'; // Assuming admin auth is handled here or via role check

const router = Router();

router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'admin-panel-service' });
});

// Commission Management (Protected)
router.use(requireAuth); // TODO: Add requireRole('ADMIN')

router.get('/commissions', AdminCommissionController.listCommissions);
router.post('/commissions/:id/cancel', AdminCommissionController.cancelCommission);
router.post('/commissions/:id/release', AdminCommissionController.releaseCommission);

// Sales Funnel (AI Leads)
import { SalesFunnelController } from './SalesFunnelController';
router.get('/funnel/abandoned', SalesFunnelController.getAbandonedCheckouts);

// Growth Engine (Vera)
import { GrowthController } from '../growth/GrowthController';
router.get('/growth/opportunities', GrowthController.getOpportunities);

// Social Media Automation (Vera Social)
import { SocialController } from '../social/SocialController';
router.post('/social/accounts', SocialController.connectAccount);
router.post('/social/posts', SocialController.createPost);
router.post('/social/generate', SocialController.generateContent);

export default router;
