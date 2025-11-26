import { Router } from 'express';
import { generateDynamicQR, validateQR } from '../controllers/qrController';

const router = Router();

// Generate a new dynamic QR code
router.post('/generate', generateDynamicQR);

// Validate an existing QR token
router.get('/:token', validateQR);

export default router;
