import { Router } from 'express';
import { healthCheck } from '../controllers/healthController';

import { OfflineSyncController } from '../controllers/OfflineSyncController';

import partnerRoutes from './partnerRoutes';

const router = Router();
const offlineSyncController = new OfflineSyncController();

router.get('/health', healthCheck);
router.post('/sync/offline-events', offlineSyncController.syncOfflineEvents);

router.use('/admin', partnerRoutes);

export default router;
