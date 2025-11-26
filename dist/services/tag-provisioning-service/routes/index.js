"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tagController_1 = require("../controllers/tagController");
const middleware_1 = require("../../../security/middleware");
const router = (0, express_1.Router)();
// Protected routes
router.post('/nfc/provision', middleware_1.requireAuth, tagController_1.provisionNFCTag);
// Public routes
router.post('/nfc/verify', tagController_1.verifyNFCTag);
router.get('/nfc/:id', tagController_1.getNFCTagMetadata);
exports.default = router;
