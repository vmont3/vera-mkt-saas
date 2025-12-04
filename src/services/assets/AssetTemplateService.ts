import { prisma } from '../../database/prismaClient';

export class AssetTemplateService {

    /**
     * Create a new Template Version
     */
    async createTemplate(categoryId: string, schema: any, isDefault: boolean = false) {
        // Get current max version
        const lastTemplate = await prisma.assetTemplate.findFirst({
            where: { categoryId },
            orderBy: { version: 'desc' }
        });

        const version = (lastTemplate?.version || 0) + 1;

        // If this is default, unset previous default
        if (isDefault) {
            await prisma.assetTemplate.updateMany({
                where: { categoryId, isDefault: true },
                data: { isDefault: false }
            });
        }

        return prisma.assetTemplate.create({
            data: {
                categoryId,
                version,
                schema,
                isDefault
            }
        });
    }

    /**
     * Get Default Template for Category
     */
    async getDefaultTemplateForCategory(categoryId: string) {
        return prisma.assetTemplate.findFirst({
            where: { categoryId, isDefault: true }
        });
    }

    /**
     * List Templates by Category
     */
    async listTemplatesByCategory(categoryId: string) {
        return prisma.assetTemplate.findMany({
            where: { categoryId },
            orderBy: { version: 'desc' }
        });
    }
}
