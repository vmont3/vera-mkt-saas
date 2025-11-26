import crypto from 'crypto';
import { store, retrieve } from '../../../vault/vault';

export async function getOrCreateQuantumSeed(): Promise<string> {
    const existing = await retrieve('quantum_seed');
    if (existing) return existing;

    // Generate cryptographically secure random seed (512 bits)
    const seed = crypto.randomBytes(64).toString('hex');
    await store('quantum_seed', seed);
    return seed;
}
