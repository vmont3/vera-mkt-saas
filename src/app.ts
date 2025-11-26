import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/requestLogger';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { attachUser, requireAuth } from './security/middleware';
import { healthCheck } from './controllers/healthController';
import verificationRouter from './services/verification-service';

// Import Service Routers
import authRouter from './services/auth-service';
import userRegistryRouter from './services/user-registry-service';
import subjectRegistryRouter from './services/subject-registry-service';
import qrRouter from './services/qr-service';
// Duplicate import removed
import walletRouter from './services/wallet-service';
import offlineEventsRouter from './services/offline-events-service';
import delegationRouter from './services/delegation-service';
import contractRouter from './services/contract-service';
import anchorRouter from './services/anchor-service';
import aiRouter from './services/ai-service';
import adminPanelRouter from './services/admin-panel-service';
import notificationsRouter from './services/notifications-service';
import tagProvisioningRouter from './services/tag-provisioning-service';

const app = express();

// Global Middlewares
app.use(cors({ origin: ['https://quantumcert.com.br', 'https://www.quantumcert.com.br'], credentials: true }));
app.use(express.json());
app.use(requestLogger);
app.use(attachUser);

// Rate Limiter (e.g., 100 requests per 15 minutes)
const limiter = rateLimiter(100, 15 * 60 * 1000);
app.use(limiter);

// Public Routes
app.get('/health', healthCheck);
app.use('/auth', authRouter);
app.use('/verify', verificationRouter); // Public for demo/verification

// Protected Routes
app.use('/users', requireAuth, userRegistryRouter);
app.use('/subjects', requireAuth, subjectRegistryRouter);
app.use('/qr', requireAuth, qrRouter);
// app.use('/verify', requireAuth, verificationRouter); // Moved to public
app.use('/wallet', requireAuth, walletRouter);
app.use('/offline-events', requireAuth, offlineEventsRouter);
app.use('/delegation', requireAuth, delegationRouter);
app.use('/contracts', requireAuth, contractRouter);
app.use('/anchor', requireAuth, anchorRouter);
app.use('/ai', requireAuth, aiRouter);
app.use('/admin', requireAuth, adminPanelRouter);
app.use('/notifications', requireAuth, notificationsRouter);
app.use('/api/tag-provisioning', tagProvisioningRouter);

// Error Handler (must be last)
app.use(errorHandler);

export default app;
