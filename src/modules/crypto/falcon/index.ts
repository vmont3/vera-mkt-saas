/**
 * Falcon Module - Index
 * 
 * Post-quantum cryptography using Falcon-512 digital signatures.
 * System-wide master keypair for asset signing.
 */

export {
    generateFalconKeypair,
    retrieveFalconPrivateKey,
    parsePublicKey,
    generateAndStoreKeypair
} from './falconKeygen';
export type { FalconKeyPair } from './falconKeygen';

export { falconSign } from './falconSign';
export type { FalconSignatureResult } from './falconSign';

export { falconVerify, falconBatchVerify } from './falconVerify';

export { buildCanonicalPayload, isCanonical } from './canonicalPayload';
export type { AssetPayload } from './canonicalPayload';
