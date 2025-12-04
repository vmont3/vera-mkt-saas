import { Router } from 'express';
import { provisionNFCTag, verifyNFCTag, getNFCTagMetadata } from '../controllers/tagController';
import { requireAuth } from '../../../security/middleware';

const router = Router();

// Protected routes
router.post('/nfc/provision', requireAuth, provisionNFCTag);

// Public routes
router.post('/nfc/verify', verifyNFCTag);
router.get('/nfc/:id', getNFCTagMetadata);

export default router;
