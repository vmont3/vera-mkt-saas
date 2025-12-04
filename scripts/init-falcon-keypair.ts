import { FalconKeyManager } from '../src/modules/crypto/falcon/FalconKeyManager';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initFalconKeypair() {
    console.log('🚀 Initializing Falcon-512 Master Keypair...');

    try {
        const manager = FalconKeyManager.getInstance();

        // 1. Generate KeyPair
        console.log('\n🔑 Generating new Falcon-512 keypair...');
        const keypair = await manager.generateKeyPair();
        console.log(`✅ KeyPair generated successfully.`);
        console.log(`   Public Key Size: ${keypair.publicKey.length} bytes`);
        console.log(`   Private Key Size: ${keypair.privateKey.length} bytes`);

        // 2. Store in IBM Secrets Manager
        const secretName = process.env.FALCON_SECRET_NAME || 'quantum-cert-falcon-master-key';
        console.log(`\n🔒 Storing private key in IBM Secrets Manager (Name: ${secretName})...`);

        const result = await manager.storeKeys(keypair, secretName);

        console.log('\n✅ FALCON-512 INITIALIZATION COMPLETE!');
        console.log('================================================================');
        console.log('📝 Update your .env file with the following values:');
        console.log('================================================================');
        console.log(`FALCON_PRIVATE_KEY_SECRET_ID=${result.secretId}`);
        console.log(`FALCON_PUBLIC_KEY_HEX=${result.publicKeyHex}`);
        console.log('================================================================');
        console.log('⚠️  KEEP THESE VALUES SECURE!');

    } catch (error: any) {
        console.error('\n❌ Initialization Failed:', error.message);
        if (error.message.includes('IBM Secrets Manager is not configured')) {
            console.log('\n💡 Tip: Ensure IBM_SM_API_KEY and IBM_SM_URL are set in your .env file.');
        }
        process.exit(1);
    }
}

initFalconKeypair();
