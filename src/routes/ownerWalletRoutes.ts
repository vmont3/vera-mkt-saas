import { Router } from 'express';
import { OwnerWalletController } from '../controllers/OwnerWalletController';
import { requireAuth } from '../security/middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// Read Endpoints
router.get('/assets', OwnerWalletController.getMyAssets);
router.get('/assets/:assetId', OwnerWalletController.getAssetDetail);
router.get('/incidents', OwnerWalletController.getMyIncidents);
router.get('/transfers/pending', OwnerWalletController.getPendingTransfers);
router.get('/audits/pending', OwnerWalletController.getPendingAudits);

// Action Endpoints
router.post('/transfers/:id/accept', OwnerWalletController.acceptTransfer);
router.post('/transfers/:id/reject', OwnerWalletController.rejectTransfer);

router.post('/audits/:id/approve', OwnerWalletController.approveAudit);
router.post('/audits/:id/reject', OwnerWalletController.rejectAudit);

export default router;
