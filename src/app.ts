import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/requestLogger';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { attachUser, requireAuth } from './security/middleware';
import { healthCheck } from './controllers/healthController';

// Import Service Routers
import authRouter from './services/auth-service';
import userRegistryRouter from './services/user-registry-service';
import subjectRegistryRouter from './services/subject-registry-service';
import qrRouter from './services/qr-service';
import verificationRouter from './services/verification-service';
import walletRouter from './services/wallet-service';
import offlineEventsRouter from './services/offline-events-service';
import partnerRouter from './modules/partners/routes/partner.routes';
import ownerWalletRouter from './routes/ownerWalletRoutes';
import quantumCertRouter from './routes/quantumCertRoutes';

// Import optional routers (comment out if not yet implemented)
// import delegationRouter from './services/delegation-service';
// import contractRouter from './services/contract-service';
// import anchorRouter from './services/anchor-service';
// import aiRouter from './services/ai-service';
// import adminPanelRouter from './services/admin-panel-service';
// import notificationsRouter from './services/notifications-service';
// import tagProvisioningRouter from './services/tag-provisioning-service';

// Initialize Express App
const app = express();

// CORS Configuration
app.use(cors());

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use(requestLogger);

// Observability Middleware (Metrics & Structured Logging)
import { observabilityMiddleware } from './middleware/observability';
import { register } from './utils/metrics';
app.use(observabilityMiddleware);

// Metrics Endpoint
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (ex) {
        res.status(500).end(ex);
    }
});

// Attach User Middleware (for JWT parsing)
app.use(attachUser);

// Rate Limiters
const globalLimiter = rateLimiter(100, 15 * 60 * 1000, 'global');
const verifyLimiter = rateLimiter(60, 60 * 1000, 'verify'); // 60/min
const authLimiter = rateLimiter(20, 60 * 1000, 'auth');     // 20/min
const syncLimiter = rateLimiter(30, 60 * 1000, 'sync');     // 30/min

app.use(globalLimiter);

// Root Route
app.get('/', (req, res) => {
    res.json({
        message: 'Quantum Cert Backend API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: '/health',
            auth: '/auth',
            verify: '/verify',
            users: '/users (protected)',
            subjects: '/subjects (protected)',
            qr: '/qr (protected)',
            wallet: '/wallet (protected)',
            offlineEvents: '/offline-events (protected)'
        }
    });
});

// Public Routes
app.get('/health', healthCheck);
app.use('/auth', authLimiter, authRouter);
app.use('/verify', verifyLimiter, verificationRouter); // Public for demo/verification

// Verun Public API (No Auth Required)
import * as publicAssetController from './controllers/publicAssetController';
const publicRouter = express.Router();
// Stricter Rate Limit for Public API (30 rpm)
const verunLimiter = rateLimiter(30, 60 * 1000);
publicRouter.use(verunLimiter);

publicRouter.get('/assets/:publicId', publicAssetController.getPublicAsset);
publicRouter.get('/assets/:publicId/incidents', publicAssetController.getPublicAssetIncidents);
publicRouter.get('/assets/:publicId/anchors', publicAssetController.getPublicAssetAnchors);
app.use('/public', publicRouter);

// Protected Routes
app.use('/users', requireAuth, userRegistryRouter);
app.use('/subjects', requireAuth, subjectRegistryRouter);
app.use('/qr', requireAuth, qrRouter);
app.use('/wallet', requireAuth, walletRouter);
app.use('/offline-events', requireAuth, syncLimiter, offlineEventsRouter);

// Owner Wallet API
app.use('/owner', requireAuth, ownerWalletRouter);

// Ownership Transfer Routes
import * as ownershipController from './controllers/ownershipController';
const ownershipRouter = express.Router();
ownershipRouter.post('/transfer', ownershipController.initiateTransfer);
ownershipRouter.post('/transfer/:transferId/accept', ownershipController.acceptTransfer);
ownershipRouter.post('/transfer/:transferId/reject', ownershipController.rejectTransfer);
ownershipRouter.post('/transfer/:transferId/cancel', ownershipController.cancelTransfer);
ownershipRouter.get('/transfers', ownershipController.getUserTransfers);
app.use('/ownership', requireAuth, ownershipRouter);

// Authority Audit Routes
import * as authorityAuditController from './controllers/authorityAuditController';
const authorityRouter = express.Router();
authorityRouter.post('/request', authorityAuditController.requestAudit);
authorityRouter.post('/approve', authorityAuditController.approveAudit);
authorityRouter.post('/reject', authorityAuditController.rejectAudit);
authorityRouter.get('/:token', authorityAuditController.getAuditData);
app.use('/authority/audit', requireAuth, authorityRouter);

app.use('/authority/audit', requireAuth, authorityRouter);

// Partner API
// Partner API
import * as partnerApiController from './controllers/partnerApiController';
import { apiKeyAuth, requireScope } from './middleware/APIKeyAuthMiddleware';
const partnerApiRouter = express.Router();
partnerApiRouter.use(apiKeyAuth); // Apply API Key Auth
partnerApiRouter.post('/assets', requireScope('asset.write'), partnerApiController.registerAsset);
partnerApiRouter.get('/assets', requireScope('asset.read'), partnerApiController.listAssets);
partnerApiRouter.get('/assets/:assetId', requireScope('asset.read'), partnerApiController.getAsset);
app.use('/partner-api', partnerApiRouter);

// Admin API Keys
// Admin API Keys
import partnerRoutes from './routes/partnerRoutes';
import categoryRoutes from './routes/categoryRoutes';
app.use('/admin', requireAuth, partnerRoutes);
app.use('/admin/categories', categoryRoutes);

// NTAG 424 DNA Core API
app.use('/api/v1/quantum-cert', verifyLimiter, quantumCertRouter);

// Optional Protected Routes (uncomment when implemented)
// app.use('/delegation', requireAuth, delegationRouter);
// app.use('/contracts', requireAuth, contractRouter);
// app.use('/anchor', requireAuth, anchorRouter);
// app.use('/ai', requireAuth, aiRouter);
// app.use('/admin', requireAuth, adminPanelRouter);
// app.use('/notifications', requireAuth, notificationsRouter);
// app.use('/api/tag-provisioning', tagProvisioningRouter);

// Error Handler (must be last)
app.use(errorHandler);

export default app;
