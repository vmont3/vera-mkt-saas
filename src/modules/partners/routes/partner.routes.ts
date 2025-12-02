import { Router } from 'express';
import { PartnerController } from '../controllers/partner.controller';
import { apiKeyAuth, requireScope } from '../../../middleware/APIKeyAuthMiddleware';

const router = Router();

// Apply middlewares for all partner routes
// Apply middlewares for all partner routes
router.use(apiKeyAuth);
// router.use(rateLimitPartnerMiddleware); // Rate limiting temporarily disabled until reimplemented

// Partner CRUD
router.post('/', PartnerController.createPartner);

// Asset endpoints
router.post('/:slug/assets/init', PartnerController.registerAsset);
router.patch('/:slug/assets/:assetId', PartnerController.updateAsset);
router.post('/:slug/assets/:assetId/review', PartnerController.reviewAsset);
router.post('/:slug/assets/:assetId/signature/request', PartnerController.requestSignature);
router.post('/:slug/signatures/:signatureId/callback', PartnerController.signatureCallback);
router.get('/:slug/assets/:assetId', PartnerController.listAssets); // list single asset could be separate, using same method for demo

// Batch endpoints
router.post('/:slug/batch', PartnerController.createBatch);
router.post('/:slug/batch/:batchId/anchor', PartnerController.anchorBatch);
router.get('/:slug/batches', PartnerController.listBatches);

// Event listing
router.get('/:slug/events', PartnerController.listEvents);

export default router;
