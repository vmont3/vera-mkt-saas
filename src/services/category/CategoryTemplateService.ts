import { prisma } from '../../database/prismaClient';

export class CategoryTemplateService {

    /**
     * Create a new category template
     */
    async createTemplate(data: {
        slug: string;
        displayName: string;
        iconUrl?: string;
        description?: string;
        fields: any;
        uiSchema: any;
    }) {
        return prisma.categoryTemplate.create({
            data
        });
    }

    /**
     * Update an existing template
     */
    async updateTemplate(slug: string, data: {
        displayName?: string;
        iconUrl?: string;
        description?: string;
        fields?: any;
        uiSchema?: any;
    }) {
        return prisma.categoryTemplate.update({
            where: { slug },
            data
        });
    }

    /**
     * Delete a template
     */
    async deleteTemplate(slug: string) {
        return prisma.categoryTemplate.delete({
            where: { slug }
        });
    }

    /**
     * Get a template by slug
     */
    async getTemplate(slug: string) {
        return prisma.categoryTemplate.findUnique({
            where: { slug }
        });
    }

    /**
     * List all templates
     */
    async listTemplates() {
        return prisma.categoryTemplate.findMany({
            orderBy: { displayName: 'asc' }
        });
    }

    /**
     * Validate and normalize asset metadata based on the template
     */
    async validateAssetMetadata(slug: string, metadata: any): Promise<{ valid: boolean; normalized?: any; error?: string }> {
        const template = await this.getTemplate(slug);
        if (!template) {
            return { valid: false, error: `Category template '${slug}' not found` };
        }

        const fields = template.fields as Record<string, any>;
        const normalized: any = {};

        // Iterate through defined fields in the template
        for (const [key, rule] of Object.entries(fields)) {
            const value = metadata[key];

            // Check required fields
            if (rule.required && (value === undefined || value === null || value === '')) {
                return { valid: false, error: `Missing required field: ${rule.label || key}` };
            }

            // If value is present, validate type and format
            if (value !== undefined && value !== null) {
                if (rule.type === 'number') {
                    const num = Number(value);
                    if (isNaN(num)) {
                        return { valid: false, error: `Field '${rule.label || key}' must be a number` };
                    }
                    normalized[key] = num;
                } else if (rule.type === 'boolean') {
                    normalized[key] = Boolean(value);
                } else {
                    // Default to string
                    normalized[key] = String(value);
                }
            }
        }

        // Optional: Allow extra fields? 
        // For strict schema, we only return normalized fields defined in the template.
        // If we want to allow flexibility, we could merge remaining fields.
        // User requirement: "Reject unknown fields" is implied by "Ensure metadata matches field definitions".
        // So we return ONLY the normalized fields.

        return { valid: true, normalized };
    }
}
