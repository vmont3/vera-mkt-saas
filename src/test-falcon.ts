
import { falcon } from 'falcon-crypto';

async function test() {
    try {
        console.log('Testing falcon-crypto...');
        const pair = await falcon.keyPair();
        console.log('Success!', pair.publicKey.length);
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
