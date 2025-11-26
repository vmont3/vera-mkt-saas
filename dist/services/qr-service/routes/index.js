"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const qrController_1 = require("../controllers/qrController");
const router = (0, express_1.Router)();
// Generate a new dynamic QR code
router.post('/generate', qrController_1.generateDynamicQR);
// Validate an existing QR token
router.get('/:token', qrController_1.validateQR);
exports.default = router;
