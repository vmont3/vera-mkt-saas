import { Router } from 'express';
import { PartnerController } from '../controllers/PartnerController';
// import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware'; // Assuming we have one, or use a placeholder

const router = Router();

// Admin routes for Partner API Keys
// TODO: Add admin authentication middleware
router.post('/partners/:partnerId/api-keys', PartnerController.createKey);
router.get('/partners/:partnerId/api-keys', PartnerController.listKeys);
router.post('/keys/:keyId/rotate', PartnerController.rotateKey);
router.post('/keys/:keyId/revoke', PartnerController.revokeKey);

export default router;
