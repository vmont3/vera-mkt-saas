"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const requestLogger_1 = require("./middleware/requestLogger");
const rateLimiter_1 = require("./middleware/rateLimiter");
const errorHandler_1 = require("./middleware/errorHandler");
const middleware_1 = require("./security/middleware");
const healthController_1 = require("./controllers/healthController");
// Import Service Routers
const auth_service_1 = __importDefault(require("./services/auth-service"));
const user_registry_service_1 = __importDefault(require("./services/user-registry-service"));
const subject_registry_service_1 = __importDefault(require("./services/subject-registry-service"));
const qr_service_1 = __importDefault(require("./services/qr-service"));
const verification_service_1 = __importDefault(require("./services/verification-service"));
const wallet_service_1 = __importDefault(require("./services/wallet-service"));
const offline_events_service_1 = __importDefault(require("./services/offline-events-service"));
// Import optional routers (comment out if not yet implemented)
// import delegationRouter from './services/delegation-service';
// import contractRouter from './services/contract-service';
// import anchorRouter from './services/anchor-service';
// import aiRouter from './services/ai-service';
// import adminPanelRouter from './services/admin-panel-service';
// import notificationsRouter from './services/notifications-service';
// import tagProvisioningRouter from './services/tag-provisioning-service';
// Initialize Express App
const app = (0, express_1.default)();
// CORS Configuration
app.use((0, cors_1.default)());
// Body Parsers
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Request Logger
app.use(requestLogger_1.requestLogger);
// Attach User Middleware (for JWT parsing)
app.use(middleware_1.attachUser);
// Rate Limiter (e.g., 100 requests per 15 minutes)
const limiter = (0, rateLimiter_1.rateLimiter)(100, 15 * 60 * 1000);
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
app.get('/health', healthController_1.healthCheck);
app.use('/auth', auth_service_1.default);
app.use('/verify', verification_service_1.default); // Public for demo/verification
// Protected Routes
app.use('/users', middleware_1.requireAuth, user_registry_service_1.default);
app.use('/subjects', middleware_1.requireAuth, subject_registry_service_1.default);
app.use('/qr', middleware_1.requireAuth, qr_service_1.default);
app.use('/wallet', middleware_1.requireAuth, wallet_service_1.default);
app.use('/offline-events', middleware_1.requireAuth, offline_events_service_1.default);
// Optional Protected Routes (uncomment when implemented)
// app.use('/delegation', requireAuth, delegationRouter);
// app.use('/contracts', requireAuth, contractRouter);
// app.use('/anchor', requireAuth, anchorRouter);
// app.use('/ai', requireAuth, aiRouter);
// app.use('/admin', requireAuth, adminPanelRouter);
// app.use('/notifications', requireAuth, notificationsRouter);
// app.use('/api/tag-provisioning', tagProvisioningRouter);
// Error Handler (must be last)
app.use(errorHandler_1.errorHandler);
exports.default = app;
