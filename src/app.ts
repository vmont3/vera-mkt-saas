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

// Attach User Middleware (for JWT parsing)
app.use(attachUser);

// Rate Limiter (e.g., 100 requests per 15 minutes)
const limiter = rateLimiter(100, 15 * 60 * 1000);
app.use(limiter);

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
app.use('/auth', authRouter);
app.use('/verify', verificationRouter); // Public for demo/verification

// Protected Routes
app.use('/users', requireAuth, userRegistryRouter);
app.use('/subjects', requireAuth, subjectRegistryRouter);
app.use('/qr', requireAuth, qrRouter);
app.use('/wallet', requireAuth, walletRouter);
app.use('/offline-events', requireAuth, offlineEventsRouter);

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
