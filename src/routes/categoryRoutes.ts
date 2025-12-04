import { Router } from 'express';
import { CategoryTemplateController } from '../controllers/CategoryTemplateController';
import { apiKeyAuth, requireScope } from '../middleware/APIKeyAuthMiddleware';

const router = Router();

// Admin routes - protected by API Key and 'admin' scope (or specific category management scope)
// Assuming 'admin' scope covers this, or we define 'category.write'
router.use(apiKeyAuth);

router.post('/', requireScope('admin'), CategoryTemplateController.createTemplate);
router.get('/', requireScope('admin'), CategoryTemplateController.listTemplates);
router.get('/:slug', requireScope('admin'), CategoryTemplateController.getTemplate);
router.put('/:slug', requireScope('admin'), CategoryTemplateController.updateTemplate);
router.delete('/:slug', requireScope('admin'), CategoryTemplateController.deleteTemplate);

export default router;
