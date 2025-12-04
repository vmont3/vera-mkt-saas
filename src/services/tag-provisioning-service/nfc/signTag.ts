import { getOrCreateQuantumSeed, generateMasterHash, generateTruncatedHash, generateIntegrityCode } from '../../qr-service/crypto';
import { store } from '../../../vault/vault';

export interface SignTagResult {
    hTrunc: string;
    integrityCode: string;
    memoryMapPayload: any;
    vaultKey: string; // key where h_master is stored
}

export async function signTag(params: {
    uid: string;
    subjectId: string;
    assetId?: string;
    targetBits?: number;
}): Promise<SignTagResult> {
    const { uid, subjectId, assetId, targetBits = 128 } = params;

    // Get quantum seed from vault
    const quantumSeed = await getOrCreateQuantumSeed();

    // Generate h_master (NEVER written to tag or DB)
    const hMaster = generateMasterHash(quantumSeed, uid, subjectId, assetId);

    // Generate h_trunc (written to tag)
    const hTrunc = generateTruncatedHash(hMaster, targetBits);

    // Generate integrity code
    const deviceSecret = process.env.DEVICE_SECRET || 'changeme';
    const integrityCode = generateIntegrityCode(hTrunc, deviceSecret);

    // Store h_master in vault (NEVER on tag or DB)
    const vaultKey = `nfc_master_${uid}`;
    await store(vaultKey, hMaster);

    return {
        hTrunc,
        integrityCode,
        memoryMapPayload: { hTrunc, integrityCode },
        vaultKey,
    };
}
