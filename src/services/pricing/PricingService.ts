import { prisma } from '../../database/prismaClient';

export enum ProductType {
    DIGITAL_REGISTRATION = 'DIGITAL_REGISTRATION',
    QTAG = 'QTAG',
    QTRACK = 'QTRACK',
    TRANSFER = 'TRANSFER'
}

export class PricingService {

    private static readonly DEFAULT_PRICES = {
        [ProductType.DIGITAL_REGISTRATION]: 10.00,
        [ProductType.QTAG]: 49.99,
        [ProductType.QTRACK]: 149.99,
        [ProductType.TRANSFER]: 49.99
    };

    /**
     * Get the price for a specific product/service.
     * Checks for Partner overrides if a partnerId is provided.
     */
    async getPrice(type: ProductType, partnerId?: string): Promise<number> {
        const defaultPrice = PricingService.DEFAULT_PRICES[type];

        if (!partnerId) {
            return defaultPrice;
        }

        // Check for B2B overrides
        const partnerConfig = await prisma.partnerConfig.findUnique({
            where: { partnerId }
        });

        if (partnerConfig && partnerConfig.config) {
            const config = partnerConfig.config as any;
            if (config.pricingRules && config.pricingRules[type] !== undefined) {
                return Number(config.pricingRules[type]);
            }
        }

        return defaultPrice;
    }

    /**
     * Calculate total price for a quantity of items
     */
    async calculateTotal(type: ProductType, quantity: number, partnerId?: string): Promise<number> {
        const unitPrice = await this.getPrice(type, partnerId);
        return unitPrice * quantity;
    }
}

export const pricingService = new PricingService();
