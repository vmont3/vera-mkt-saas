import { AlgorandAnchorService } from '../src/services/blockchain/AlgorandAnchorService';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function testAlgorandAnchor() {
    console.log('🚀 Starting Algorand Anchoring Test...');

    const anchorService = new AlgorandAnchorService();
    const assetId = `test-asset-${Date.now()}`;
    const falconHash = '0000000000000000000000000000000000000000000000000000000000000000'; // 32 bytes hex

    try {
        console.log(`⚓ Anchoring asset ${assetId}...`);
        const { txId } = await anchorService.anchorAsset(assetId, falconHash);
        console.log(`✅ Anchored! TxID: ${txId}`);

        console.log('🔍 Verifying in DB...');
        const anchors = await anchorService.getAnchorsForAsset(assetId);
        console.log('Found anchors:', anchors);

        if (anchors.length > 0 && anchors[0].txId === txId) {
            console.log('🎉 SUCCESS: Anchor persisted correctly.');
        } else {
            console.error('❌ FAILURE: Anchor not found in DB.');
        }

    } catch (error: any) {
        console.error('❌ Test Failed:', error.message);
        if (error.message.includes('Algorand account not configured')) {
            console.warn('⚠️  This is expected if ALGORAND_QC_ACCOUNT_MNEMONIC is not set.');
        }
    } finally {
        await prisma.$disconnect();
    }
}

testAlgorandAnchor();
