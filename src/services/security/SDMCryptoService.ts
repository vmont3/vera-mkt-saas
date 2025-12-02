import * as crypto from 'crypto';
// @ts-ignore
const { AesCmac } = require('aes-cmac');

export class SDMCryptoService {
    deriveSDMSessionKeys(
        kSdm: Buffer,
        uid: Buffer,
        sdmReadCtr: number
    ): { encKey: Buffer; macKey: Buffer } {
        if (kSdm.length !== 16) throw new Error('K_SDM must be 16 bytes (AES-128)');

        const ctrBuffer = Buffer.alloc(3);
        ctrBuffer.writeUIntLE(sdmReadCtr, 0, 3);
        const context = Buffer.concat([uid, ctrBuffer]);

        const encLabel = Buffer.from([0x01, 0x45, 0x4E, 0x43, 0x00]);
        const encSuffix = Buffer.from([0x00, 0x80]);
        const encInput = Buffer.concat([encLabel, context, encSuffix]);

        const cmac = new AesCmac(kSdm);
        const encKey = cmac.calculate(encInput).slice(0, 16);

        const macLabel = Buffer.from([0x01, 0x4D, 0x41, 0x43, 0x00]);
        const macInput = Buffer.concat([macLabel, context, encSuffix]);
        const macKey = cmac.calculate(macInput).slice(0, 16);

        return { encKey, macKey };
    }

    encryptSDMFileData(plaintext: Buffer, sessionKey: Buffer): Buffer {
        if (sessionKey.length !== 16) throw new Error('Session key must be 16 bytes');
        const iv = Buffer.alloc(16, 0);
        const cipher = crypto.createCipheriv('aes-128-cbc', sessionKey, iv);
        cipher.setAutoPadding(true);
        return Buffer.concat([cipher.update(plaintext), cipher.final()]);
    }

    decryptSDMFileData(ciphertext: Buffer, sessionKey: Buffer): Buffer {
        if (sessionKey.length !== 16) throw new Error('Session key must be 16 bytes');
        const iv = Buffer.alloc(16, 0);
        const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKey, iv);
        decipher.setAutoPadding(true);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    }

    computeSDMMAC(data: Buffer, macInputOffset: number, macKey: Buffer): string {
        const macInput = data.slice(macInputOffset);
        const cmac = new AesCmac(macKey);
        const fullMac = cmac.calculate(macInput);
        const truncatedMac = fullMac.slice(0, 8);
        return truncatedMac.toString('hex').toUpperCase();
    }

    verifySDMMAC(data: Buffer, macInputOffset: number, providedMac: string, macKey: Buffer): boolean {
        const calculatedMac = this.computeSDMMAC(data, macInputOffset, macKey);
        return calculatedMac.toUpperCase() === providedMac.toUpperCase();
    }
}

