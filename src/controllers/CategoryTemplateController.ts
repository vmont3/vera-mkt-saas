import { Request, Response } from 'express';
import { CategoryTemplateService } from '../services/category/CategoryTemplateService';
import { AuditLogService } from '../services/audit/AuditLogService';

const categoryService = new CategoryTemplateService();
const auditService = new AuditLogService();

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        [key: string]: any;
    };
}

export class CategoryTemplateController {

    /**
     * Create a new template
     * POST /admin/categories
     */
    static async createTemplate(req: Request, res: Response) {
        try {
            const { slug, displayName, iconUrl, description, fields, uiSchema } = req.body;
            const userId = (req as AuthenticatedRequest).user?.id || 'admin';

            if (!slug || !displayName || !fields || !uiSchema) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const template = await categoryService.createTemplate({
                slug, displayName, iconUrl, description, fields, uiSchema
            });

            await auditService.log({
                eventType: 'CATEGORY_TEMPLATE_CREATED',
                severity: 'INFO',
                actorType: 'ADMIN',
                actorId: userId,
                payload: { slug, displayName }
            });

            res.status(201).json(template);
        } catch (error) {
            console.error('Error creating template:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * List all templates
     * GET /admin/categories
     */
    static async listTemplates(req: Request, res: Response) {
        try {
            const templates = await categoryService.listTemplates();
            res.json(templates);
        } catch (error) {
            console.error('Error listing templates:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Get a template by slug
     * GET /admin/categories/:slug
     */
    static async getTemplate(req: Request, res: Response) {
        try {
            const { slug } = req.params;
            const template = await categoryService.getTemplate(slug);

            if (!template) {
                return res.status(404).json({ error: 'Template not found' });
            }

            res.json(template);
        } catch (error) {
            console.error('Error getting template:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Update a template
     * PUT /admin/categories/:slug
     */
    static async updateTemplate(req: Request, res: Response) {
        try {
            const { slug } = req.params;
            const data = req.body;
            const userId = (req as AuthenticatedRequest).user?.id || 'admin';

            const updated = await categoryService.updateTemplate(slug, data);

            await auditService.log({
                eventType: 'CATEGORY_TEMPLATE_UPDATED',
                severity: 'INFO',
                actorType: 'ADMIN',
                actorId: userId,
                payload: { slug, updates: Object.keys(data) }
            });

            res.json(updated);
        } catch (error) {
            console.error('Error updating template:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Delete a template
     * DELETE /admin/categories/:slug
     */
    static async deleteTemplate(req: Request, res: Response) {
        try {
            const { slug } = req.params;
            const userId = (req as AuthenticatedRequest).user?.id || 'admin';

            await categoryService.deleteTemplate(slug);

            await auditService.log({
                eventType: 'CATEGORY_TEMPLATE_DELETED',
                severity: 'WARNING',
                actorType: 'ADMIN',
                actorId: userId,
                payload: { slug }
            });

            res.json({ message: 'Template deleted' });
        } catch (error) {
            console.error('Error deleting template:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
