import { APIKeyService } from '../src/services/auth/APIKeyService';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const apiKeyService = new APIKeyService();

async function testAPIKeys() {
    console.log('🧪 Testing API Key Service...');

    try {
        // 1. Setup Test Partner
        const partner = await prisma.partner.findFirst();
        if (!partner) {
            console.error('❌ No partner found. Please seed database.');
            return;
        }
        console.log('✅ Using Partner:', partner.name);

        // 2. Generate Key
        console.log('🔄 Generating Key...');
        const { apiKey, keyId } = await apiKeyService.generateKey(
            partner.id,
            'Test Key',
            ['asset.read', 'asset.write']
        );
        console.log('✅ Key Generated:', apiKey);

        // 3. Validate Key
        console.log('🔄 Validating Key...');
        const valid = await apiKeyService.validateKey(apiKey);
        if (valid && valid.partnerId === partner.id) {
            console.log('✅ Key Validated');
        } else {
            console.error('❌ Key Validation Failed');
        }

        // 4. Rotate Key
        console.log('🔄 Rotating Key...');
        const { apiKey: newApiKey, keyId: newKeyId } = await apiKeyService.rotateKey(keyId);
        console.log('✅ Key Rotated. New Key:', newApiKey);

        // 5. Validate Old Key (Should fail)
        const oldValid = await apiKeyService.validateKey(apiKey);
        if (!oldValid) {
            console.log('✅ Old Key Invalidated');
        } else {
            console.error('❌ Old Key Still Valid');
        }

        // 6. Validate New Key
        const newValid = await apiKeyService.validateKey(newApiKey);
        if (newValid) {
            console.log('✅ New Key Validated');
        } else {
            console.error('❌ New Key Validation Failed');
        }

        // 7. Revoke Key
        console.log('🔄 Revoking Key...');
        await apiKeyService.revokeKey(newKeyId);
        const revokedValid = await apiKeyService.validateKey(newApiKey);
        if (!revokedValid) {
            console.log('✅ Key Revoked');
        } else {
            console.error('❌ Revoked Key Still Valid');
        }

        console.log('🎉 API Key Tests Passed!');

    } catch (error) {
        console.error('❌ Test Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    testAPIKeys();
}
