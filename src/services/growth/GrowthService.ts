import { prisma } from '../../database/prismaClient';

export interface Opportunity {
    assistant: string;
    action: string;
    target: string;
    context: string;
    script: string;
    priority: number;
}

export class GrowthService {

    /**
     * Analyze a user's assets and history to update their Persona
     */
    static async analyzeUser(userId: string) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    assetsOwned: { include: { partner: true } },
                    orders: { include: { items: true } }
                }
            });

            if (!user) return;

            // 1. Infer Persona Traits
            let isPetOwner = false;
            let isParent = false;
            let isVehicleOwner = false;
            let isBusiness = false;

            for (const asset of user.assetsOwned) {
                const type = asset.type.toLowerCase();
                const meta = asset.metadata as any;

                if (type === 'pet' || type === 'dog' || type === 'cat') isPetOwner = true;
                if (type === 'child' || type === 'kid' || meta?.isChild) isParent = true;
                if (type === 'vehicle' || type === 'car' || type === 'bike') isVehicleOwner = true;
            }

            if (user.assetsOwned.length > 10) isBusiness = true;

            // 2. Generate Opportunities (AI Prompts for Vera)
            const opportunities: Opportunity[] = [];

            // Rule: Pet Owner without QTRACK
            if (isPetOwner) {
                const hasQTrack = user.orders.some(o =>
                    o.items.some(i => i.description.includes('QTRACK'))
                );

                if (!hasQTrack) {
                    // Find the pet's name
                    const pet = user.assetsOwned.find(a => ['pet', 'dog', 'cat'].includes(a.type.toLowerCase()));
                    const petName = (pet?.metadata as any)?.name || 'seu pet';

                    opportunities.push({
                        assistant: 'Vera',
                        action: 'Send WhatsApp',
                        target: user.email, // Or phone if available
                        context: `Pet Owner (${petName})`,
                        script: `Olá! Sou a Vera da Quantum Cert. Vi que você protegeu o ${petName} com nosso Registro Digital. Já pensou no que faria se ele fugisse? A QTRACK resolve isso em tempo real.`,
                        priority: 10
                    });
                }
            }

            // Rule: Parent without QTRACK
            if (isParent) {
                const hasQTrack = user.orders.some(o =>
                    o.items.some(i => i.description.includes('QTRACK'))
                );

                if (!hasQTrack) {
                    opportunities.push({
                        assistant: 'Vera',
                        action: 'Send WhatsApp',
                        target: user.email,
                        context: 'Parent (Child Safety)',
                        script: `Olá! Sou a Vera. Parabéns por proteger os dados médicos do seu filho. Que tal garantir a segurança física dele também com a QTRACK? Saiba sempre onde ele está.`,
                        priority: 9
                    });
                }
            }

            // Rule: Vehicle Owner (Insurance Cross-sell)
            if (isVehicleOwner) {
                opportunities.push({
                    assistant: 'Vera',
                    action: 'Send Email',
                    target: user.email,
                    context: 'Vehicle Owner',
                    script: `Olá! Sou a Vera. Vi que você registrou seu veículo. Sabia que isso pode reduzir o valor do seu seguro? Posso cotar para você com nossos parceiros?`,
                    priority: 5
                });
            }

            // 3. Save Persona
            await prisma.userPersona.upsert({
                where: { userId },
                create: {
                    userId,
                    isPetOwner,
                    isParent,
                    isVehicleOwner,
                    isBusiness,
                    opportunities: opportunities as any,
                    lastAnalyzed: new Date()
                },
                update: {
                    isPetOwner,
                    isParent,
                    isVehicleOwner,
                    isBusiness,
                    opportunities: opportunities as any,
                    lastAnalyzed: new Date()
                }
            });

            console.log(`[GrowthEngine] Analyzed user ${userId}. Opportunities: ${opportunities.length}`);

        } catch (error) {
            console.error('[GrowthEngine] Analysis failed:', error);
        }
    }

    /**
     * Trigger analysis for all users (Daily Job)
     */
    static async runDailyAnalysis() {
        const users = await prisma.user.findMany({ select: { id: true } });
        for (const u of users) {
            await this.analyzeUser(u.id);
        }
    }
}
