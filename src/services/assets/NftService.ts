import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

import { UserService } from '../user-registry-service/UserService';

export class NftService {
    private userService: UserService | null = null;

    setUserService(service: UserService) {
        this.userService = service;
    }
    /**
     * Mint NFT with Transaction (Fix Deadlock/Race Condition)
     */
    async mintNFT(assetData: any) {
        return await prisma.$transaction(async (tx) => {
            // Using PartnerAsset as the main asset model
            const asset = await tx.partnerAsset.create({ data: assetData });

            // Create an event to justify the transaction and ensure consistency
            await tx.partnerEvent.create({
                data: {
                    partnerId: assetData.partnerId,
                    eventType: 'NFT_MINTED',
                    payload: { assetId: asset.id },
                    assetId: asset.id
                }
            });

            return asset;
        });
    }

    /**
     * Transfer Asset with Status Check (Fix Inconsistent State)
     */
    async transferAsset(assetId: string, toAddress: string) {
        const asset = await prisma.partnerAsset.findUnique({ where: { id: assetId } });
        if (!asset) throw new Error('Asset not found');

        if (asset.status !== 'ACTIVE') {
            throw new Error(`Cannot transfer ${asset.status} asset`);
        }

        // Proceed with transfer logic...
        // This is a mock implementation of the transfer logic
        console.log(`Transferring asset ${assetId} to ${toAddress}`);
    }
}
