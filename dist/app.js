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
const delegation_service_1 = __importDefault(require("./services/delegation-service"));
const contract_service_1 = __importDefault(require("./services/contract-service"));
const anchor_service_1 = __importDefault(require("./services/anchor-service"));
const ai_service_1 = __importDefault(require("./services/ai-service"));
const admin_panel_service_1 = __importDefault(require("./services/admin-panel-service"));
const notifications_service_1 = __importDefault(require("./services/notifications-service"));
const tag_provisioning_service_1 = __importDefault(require("./services/tag-provisioning-service"));
const app = (0, express_1.default)();
// Global Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(requestLogger_1.requestLogger);
app.use(middleware_1.attachUser);
// Rate Limiter (e.g., 100 requests per 15 minutes)
const limiter = (0, rateLimiter_1.rateLimiter)(100, 15 * 60 * 1000);
app.use(limiter);
// Public Routes
app.get('/health', healthController_1.healthCheck);
app.use('/auth', auth_service_1.default);
app.use('/verify', verification_service_1.default); // Public for demo/verification
// Protected Routes
app.use('/users', middleware_1.requireAuth, user_registry_service_1.default);
app.use('/subjects', middleware_1.requireAuth, subject_registry_service_1.default);
app.use('/qr', middleware_1.requireAuth, qr_service_1.default);
// app.use('/verify', requireAuth, verificationRouter); // Moved to public
app.use('/wallet', middleware_1.requireAuth, wallet_service_1.default);
app.use('/offline-events', middleware_1.requireAuth, offline_events_service_1.default);
app.use('/delegation', middleware_1.requireAuth, delegation_service_1.default);
app.use('/contracts', middleware_1.requireAuth, contract_service_1.default);
app.use('/anchor', middleware_1.requireAuth, anchor_service_1.default);
app.use('/ai', middleware_1.requireAuth, ai_service_1.default);
app.use('/admin', middleware_1.requireAuth, admin_panel_service_1.default);
app.use('/notifications', middleware_1.requireAuth, notifications_service_1.default);
app.use('/api/tag-provisioning', tag_provisioning_service_1.default);
// Error Handler (must be last)
app.use(errorHandler_1.errorHandler);
exports.default = app;
