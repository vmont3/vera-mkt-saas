"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../auth-service/middleware/requireAuth");
const uploadMiddleware_1 = require("./middleware/uploadMiddleware");
const SubjectController_1 = require("./controllers/SubjectController");
const router = (0, express_1.Router)();
// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'subject-registry-service' });
});
// CRUD routes - all protected by auth
router.post('/', requireAuth_1.requireAuth, uploadMiddleware_1.upload.array('images', 5), SubjectController_1.createSubject);
router.get('/', requireAuth_1.requireAuth, SubjectController_1.getSubjects);
router.get('/:id', requireAuth_1.requireAuth, SubjectController_1.getSubjectById);
router.put('/:id', requireAuth_1.requireAuth, SubjectController_1.updateSubject);
router.delete('/:id', requireAuth_1.requireAuth, SubjectController_1.deleteSubject);
exports.default = router;
