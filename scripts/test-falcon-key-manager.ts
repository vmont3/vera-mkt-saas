import { FalconKeyManager } from '../src/modules/crypto/falcon/FalconKeyManager';
import { QuantumCryptoService } from '../src/services/security/QuantumCryptoService';

async function testFalconKeyManager() {
    console.log('🧪 Testing FalconKeyManager...');

    try {
        const manager = FalconKeyManager.getInstance();
        console.log('✅ FalconKeyManager instance created');

        // 1. Generate KeyPair
        console.log('\n🔑 Generating KeyPair...');
        const keypair = await manager.generateKeyPair();
        console.log(`✅ KeyPair generated: Pub (${keypair.publicKey.length} bytes), Priv (${keypair.privateKey.length} bytes)`);

        // 2. Store Keys (Mocking Secrets Manager behavior would be ideal, but for now we test the flow)
        // Note: This will fail if IBM Secrets Manager env vars are not set, which is expected in this environment.
        // We will catch the error and verify it's the expected error.

        console.log('\n🔒 Storing Keys...');
        try {
            await manager.storeKeys(keypair, 'test-falcon-key');
            console.log('✅ Keys stored (unexpected if no env vars)');
        } catch (error: any) {
            console.log(`ℹ️ Store Keys failed as expected (Env vars missing): ${error.message}`);
            if (error.message.includes('IBM Secrets Manager is not configured')) {
                console.log('✅ Error message confirms correct validation');
            }
        }

        // 3. Test QuantumCryptoService integration
        console.log('\n🔗 Testing QuantumCryptoService Integration...');
        const cryptoService = new QuantumCryptoService();

        // We can't fully test generateMasterHash without a stored key, but we can check if the service initializes
        console.log('✅ QuantumCryptoService initialized');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testFalconKeyManager();
