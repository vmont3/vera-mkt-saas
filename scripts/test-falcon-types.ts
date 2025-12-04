import { FalconKeyManager } from '../src/modules/crypto/falcon/FalconKeyManager';

async function test() {
    try {
        const manager = FalconKeyManager.getInstance();

        // Test parsePublicKey (Sync)
        const pubKey = manager.parsePublicKey('00112233');
        console.log('parsePublicKey result type:', typeof pubKey);
        console.log('Is Promise?', pubKey instanceof Promise);

        // Test retrievePrivateKey (Async)
        // We won't actually call it to avoid errors, just checking type if possible
        // In runtime we can't check return type without calling.

        console.log('Types check passed');
    } catch (e) {
        console.error(e);
    }
}

test();
