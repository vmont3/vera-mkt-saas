import { prisma } from '../../database/prismaClient';

export class AssetCategoryService {

    /**
     * Create a new Asset Category
     */
    async createCategory(data: {
        slug: string;
        name: string;
        description?: string;
    }) {
        return prisma.assetCategory.create({
            data: {
                slug: data.slug,
                name: data.name,
                description: data.description,
                active: true
            }
        });
    }

    /**
     * Get Category by Slug
     */
    async getCategoryBySlug(slug: string) {
        return prisma.assetCategory.findUnique({
            where: { slug }
        });
    }

    /**
     * List Active Categories
     */
    async listCategories() {
        return prisma.assetCategory.findMany({
            where: { active: true },
            orderBy: { name: 'asc' }
        });
    }

    /**
     * Deactivate Category
     */
    async deactivateCategory(id: string) {
        return prisma.assetCategory.update({
            where: { id },
            data: { active: false }
        });
    }
}
