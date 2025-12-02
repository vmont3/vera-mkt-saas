import {
    deriveSdmSessionKeys,
    encodeSdmPlain,
    decodeSdmPlain,
    buildSdmEncrypted,
    verifyAndDecryptSdm,
    ctrToNumber,
    numberToCtr,
    SdmPayloadPlain
} from '../modules/tag-encoding/crypto/SdmCryptoService';

describe('SDM Crypto Service - NTAG 424 DNA', () => {
    describe('Session Key Derivation', () => {
        it('should derive session keys from K_SDM, UID, and CTR', async () => {
            const kSdm = Buffer.from('00112233445566778899AABBCCDDEEFF', 'hex');
            const uid = Buffer.from('04112233445566', 'hex'); // 7 bytes
            const sdmReadCtr = Buffer.from([0x39, 0x30, 0x00]); // CTR = 12345 little-endian

            const { encKey, macKey } = await deriveSdmSessionKeys(kSdm, uid, sdmReadCtr);

            expect(encKey).toBeInstanceOf(Buffer);
            expect(macKey).toBeInstanceOf(Buffer);
            expect(encKey.length).toBe(16);
            expect(macKey.length).toBe(16);
            // NTAG 424 DNA SDM uses SAME key for ENC and MAC
            expect(encKey.toString('hex')).toBe(macKey.toString('hex'));
        });

        it('should derive different keys for different counters', async () => {
            const kSdm = Buffer.from('00112233445566778899AABBCCDDEEFF', 'hex');
            const uid = Buffer.from('04112233445566', 'hex');
            const ctr1 = numberToCtr(1);
            const ctr2 = numberToCtr(2);

            const keys1 = await deriveSdmSessionKeys(kSdm, uid, ctr1);
            const keys2 = await deriveSdmSessionKeys(kSdm, uid, ctr2);

            expect(keys1.encKey.toString('hex')).not.toBe(keys2.encKey.toString('hex'));
        });
    });

    describe('CTR Conversion', () => {
        it('should convert CTR to number (little-endian)', () => {
            const ctr = Buffer.from([0x39, 0x30, 0x00]); // 12345 in little-endian
            const value = ctrToNumber(ctr);
            expect(value).toBe(12345);
        });

        it('should convert number to CTR (little-endian)', () => {
            const ctr = numberToCtr(12345);
            expect(ctr).toEqual(Buffer.from([0x39, 0x30, 0x00]));
        });

        it('should handle max CTR value (0xFFFFFF)', () => {
            const maxCtr = numberToCtr(0xFFFFFF);
            expect(ctrToNumber(maxCtr)).toBe(16777215);
        });
    });

    describe('Payload Encoding/Decoding', () => {
        it('should encode and decode 64-byte payload', () => {
            const payload: SdmPayloadPlain = {
                uid: Buffer.from('04112233445566', 'hex'),
                sdmReadCtr: numberToCtr(12345),
                truncatedHash: '0123456789abcdef0123456789abcdef',
                tagInternalId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                schemaVersion: 1
            };

            const encoded = encodeSdmPlain(payload);
            expect(encoded.length).toBe(64);

            const decoded = decodeSdmPlain(encoded);
            expect(decoded.uid.toString('hex')).toBe(payload.uid.toString('hex'));
            expect(ctrToNumber(decoded.sdmReadCtr)).toBe(12345);
            expect(decoded.truncatedHash).toBe(payload.truncatedHash);
            expect(decoded.tagInternalId).toBe(payload.tagInternalId);
            expect(decoded.schemaVersion).toBe(payload.schemaVersion);
        });
    });

    describe('SDM Encryption/Decryption', () => {
        it('should encrypt and decrypt with MAC validation', async () => {
            const kSdm = Buffer.from('00112233445566778899AABBCCDDEEFF', 'hex');

            const payload: SdmPayloadPlain = {
                uid: Buffer.from('04A1B2C3D4E5F6', 'hex'),
                sdmReadCtr: numberToCtr(100),
                truncatedHash: 'abcdef0123456789abcdef0123456789',
                tagInternalId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                schemaVersion: 1
            };

            // Encrypt
            const { sdmEnc, sdmMac } = await buildSdmEncrypted(kSdm, payload);

            expect(sdmEnc.length).toBe(64);
            expect(sdmMac.length).toBe(8);

            // Decrypt and verify
            const decrypted = await verifyAndDecryptSdm(
                kSdm,
                payload.uid,
                payload.sdmReadCtr,
                sdmEnc,
                sdmMac
            );

            expect(decrypted.uid.toString('hex')).toBe(payload.uid.toString('hex'));
            expect(decrypted.truncatedHash).toBe(payload.truncatedHash);
            expect(decrypted.tagInternalId).toBe(payload.tagInternalId);
        });

        it('should reject invalid MAC', async () => {
            const kSdm = Buffer.from('00112233445566778899AABBCCDDEEFF', 'hex');

            const payload: SdmPayloadPlain = {
                uid: Buffer.from('04A1B2C3D4E5F6', 'hex'),
                sdmReadCtr: numberToCtr(100),
                truncatedHash: 'abcdef0123456789abcdef0123456789',
                tagInternalId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                schemaVersion: 1
            };

            const { sdmEnc } = await buildSdmEncrypted(kSdm, payload);
            const invalidMac = Buffer.from('DEADBEEFDEADBEEF', 'hex');

            await expect(verifyAndDecryptSdm(kSdm, payload.uid, payload.sdmReadCtr, sdmEnc, invalidMac))
                .rejects.toThrow('MAC validation failed');
        });

        it('should detect UID mismatch', async () => {
            const kSdm = Buffer.from('00112233445566778899AABBCCDDEEFF', 'hex');

            const payload: SdmPayloadPlain = {
                uid: Buffer.from('04A1B2C3D4E5F6', 'hex'),
                sdmReadCtr: numberToCtr(100),
                truncatedHash: 'abcdef0123456789abcdef0123456789',
                tagInternalId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                schemaVersion: 1
            };

            const { sdmEnc, sdmMac } = await buildSdmEncrypted(kSdm, payload);

            // Try with different UID
            const differentUid = Buffer.from('04FFFFFFFFFFFF', 'hex');

            await expect(verifyAndDecryptSdm(kSdm, differentUid, payload.sdmReadCtr, sdmEnc, sdmMac))
                .rejects.toThrow('MAC validation failed');
        });
    });
});
