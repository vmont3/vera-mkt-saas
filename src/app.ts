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

import helmet from 'helmet';
import { hppMiddleware, requestIdMiddleware, headerCleanupMiddleware } from './middleware/security';

// CORS Configuration
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);

// Error 19: CSP Fix
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
        },
    },
}));

// Error 22: Disable X-Powered-By
app.disable('x-powered-by');

// Apply Security Middlewares
app.use(hppMiddleware);
app.use(requestIdMiddleware);
app.use(headerCleanupMiddleware);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.length === 0 || allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }

        return callback(new Error('CORS not allowed by policy'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

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
// Legacy routes moved to /api/v1 (See below)

// NTAG 424 DNA Core API
app.use('/api/v1/quantum-cert', verifyLimiter, quantumCertRouter);

// Versioned API Routes (v1)
const apiV1 = express.Router();

// Placeholder Routers for compilation (Replace with actual imports/implementations)
const publicRouter = express.Router();
const ownershipRouter = express.Router();
const authorityRouter = express.Router();
const partnerApiRouter = express.Router();
const partnerRoutes = express.Router();
const categoryRoutes = express.Router();

apiV1.get('/health', healthCheck);
apiV1.use('/auth', authLimiter, authRouter);
apiV1.use('/verify', verifyLimiter, verificationRouter);
apiV1.use('/public', publicRouter);

// Protected V1 Routes
apiV1.use('/users', requireAuth, userRegistryRouter);
apiV1.use('/subjects', requireAuth, subjectRegistryRouter);
apiV1.use('/qr', requireAuth, qrRouter);
apiV1.use('/wallet', requireAuth, walletRouter);
apiV1.use('/offline-events', requireAuth, syncLimiter, offlineEventsRouter);
apiV1.use('/owner', requireAuth, ownerWalletRouter);
apiV1.use('/ownership', requireAuth, ownershipRouter);
apiV1.use('/authority/audit', requireAuth, authorityRouter);
apiV1.use('/partner-api', partnerApiRouter);
apiV1.use('/admin', requireAuth, partnerRoutes);
apiV1.use('/admin/categories', categoryRoutes);

// Mount v1 Router
app.use('/api/v1', apiV1);

// Maintain legacy routes for backward compatibility (optional, or redirect)
// app.use('/', apiV1);

// Optional Protected Routes (uncomment when implemented)
// app.use('/delegation', requireAuth, delegationRouter);
// app.use('/contracts', requireAuth, contractRouter);
// app.use('/anchor', requireAuth, anchorRouter);
// app.use('/ai', requireAuth, aiRouter);
// app.use('/admin', requireAuth, adminPanelRouter);
// app.use('/notifications', requireAuth, notificationsRouter);
// app.use('/api/tag-provisioning', tagProvisioningRouter);

// Error Handler (must be last)
// Error Handler (must be last)
// app.use(errorHandler); // Replaced by AllExceptionsFilter logic if using NestJS, but this is Express.
// Since this is Express, we need an adapter or just a middleware.
// The user provided NestJS code (@Catch), but the app is Express.
// I will adapt the filter to an Express error handler.

import { Request, Response, NextFunction } from 'express';

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    const isProduction = process.env.NODE_ENV === 'production';

    res.status(status).json({
        statusCode: status,
        message: message,
        ...(isProduction ? {} : { stack: err.stack })
    });
});

export default app;
