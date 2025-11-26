"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const routes_1 = __importDefault(require("./routes"));
const router = (0, express_1.Router)();
router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'auth-service' });
});
router.use('/', routes_1.default);
exports.default = router;
