import { Router } from 'express';
import { VerificationController } from '../modules/verification/VerificationController';
import { IncidentController } from '../controllers/IncidentController';
import { TagRegistryController } from '../controllers/TagRegistryController';
import { EncodingController } from '../controllers/EncodingController';
import { apiKeyAuth, requireScope } from '../middleware/APIKeyAuthMiddleware';

const router = Router();
const verificationController = new VerificationController();

// ========== VERIFICATION ROUTES (PUBLIC) ==========
router.post('/verify-tag', verificationController.verify);

// ========== ENCODING ROUTES (PROTECTED) ==========
router.post('/encode/start', apiKeyAuth, requireScope('encoding.write'), EncodingController.startEncoding);
router.get('/encode/status/:jobId', apiKeyAuth, requireScope('encoding.read'), EncodingController.getStatus);
router.get('/encode/queue', apiKeyAuth, requireScope('encoding.read'), EncodingController.listQueue);

// ========== REGISTRY & ENCODING ROUTES (PROTECTED) ==========
router.post('/registry/assets', apiKeyAuth, requireScope('asset.write'), TagRegistryController.registerAsset);
router.post('/registry/prepare-encoding', apiKeyAuth, requireScope('encoding.write'), TagRegistryController.prepareEncoding);
router.get('/registry/queue', apiKeyAuth, requireScope('encoding.read'), TagRegistryController.listEncodingQueue);

// ========== INCIDENT ROUTES (PROTECTED) ==========
router.post('/incidentes', apiKeyAuth, requireScope('incident.report'), IncidentController.createIncident);
router.post('/incidentes/delegado', apiKeyAuth, requireScope('incident.authority'), IncidentController.createAuthorityIncident);
router.get('/incidentes/pendentes', apiKeyAuth, requireScope('incident.read'), IncidentController.listPending);
router.post('/incidentes/:id/aprovar', apiKeyAuth, requireScope('incident.approve'), IncidentController.approve);
router.post('/incidentes/:id/rejeitar', apiKeyAuth, requireScope('incident.approve'), IncidentController.reject);

export default router;
