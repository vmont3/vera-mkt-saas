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
    async transferAsset(assetId: string, toAddress: string, requesterId: string) {
        const asset = await prisma.partnerAsset.findUnique({ where: { id: assetId } });
        if (!asset) throw new Error('Asset not found');

        // Fix: Verify Ownership
        if (asset.ownerId !== requesterId) {
            throw new Error('Unauthorized: You are not the owner of this asset');
        }

        if (asset.status !== 'ACTIVE') {
            throw new Error(`Cannot transfer ${asset.status} asset`);
        }

        // Proceed with transfer logic...
        // In a real scenario, this would interact with the blockchain
        console.log(`Transferring asset ${assetId} to ${toAddress}`);

        // Update local state
        await prisma.partnerAsset.update({
            where: { id: assetId },
            data: { ownerId: null, status: 'TRANSFER_PENDING' } // Temporary state
        });
    }
}
