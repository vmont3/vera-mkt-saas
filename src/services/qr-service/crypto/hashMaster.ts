import { sha3_512 } from 'js-sha3';

export function generateMasterHash(
    quantumSeed: string,
    uid: string,
    subjectId: string,
    assetId?: string
): string {
    const input = `${quantumSeed}:${uid}:${subjectId}:${assetId || ''}`;
    return sha3_512(input);
}
