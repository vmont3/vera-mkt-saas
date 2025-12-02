import crypto from 'crypto';
const { AesCmac } = require('aes-cmac');

export class CryptoUtils {

    /**
     * Calcula AES-CMAC (RFC 4493)
     */
    static async calculateCmac(key: Buffer, data: Buffer): Promise<Buffer> {
        // aes-cmac library usage: new AesCmac(key).calculate(data)
        // calculate returns a Promise<Buffer> or Buffer depending on version, but test showed Promise.
        const cmac = new AesCmac(key);
        return cmac.calculate(data);
    }

    /**
     * Encripta AES-128-CTR
     */
    static encryptAesCtr(key: Buffer, iv: Buffer, data: Buffer): Buffer {
        const cipher = crypto.createCipheriv('aes-128-ctr', key, iv);
        cipher.setAutoPadding(false);
        return Buffer.concat([cipher.update(data), cipher.final()]);
    }

    /**
     * Decripta AES-128-CTR
     */
    static decryptAesCtr(key: Buffer, iv: Buffer, data: Buffer): Buffer {
        const decipher = crypto.createDecipheriv('aes-128-ctr', key, iv);
        decipher.setAutoPadding(false);
        return Buffer.concat([decipher.update(data), decipher.final()]);
    }

    /**
     * Deriva chave de sessão para NTAG 424 DNA (SDM)
     * Algoritmo: CMAC(K_SDM, SV)
     * SV = 0x3C || 0x01 || 0x00 || 0x80 || UID (7 bytes) || CTR (3 bytes)
     * Total SV length = 4 + 7 + 3 = 14 bytes.
     * Note: Some docs say padding to 16 bytes is needed for CMAC input if not block aligned?
     * CMAC handles padding internally (M_last).
     */
    static async deriveSessionKey(sdmKey: Buffer, uid: Buffer, ctr: Buffer): Promise<Buffer> {
        if (uid.length !== 7) throw new Error("UID deve ter 7 bytes");
        if (ctr.length !== 3) throw new Error("CTR deve ter 3 bytes");

        const sv = Buffer.concat([
            Buffer.from([0x3C, 0x01, 0x00, 0x80]), // Constants for SDM Session Key
            uid,
            ctr
        ]);

        return this.calculateCmac(sdmKey, sv);
    }

    /**
     * Constant-time comparison to prevent timing attacks
     */
    static constantTimeEqual(a: Buffer, b: Buffer): boolean {
        if (a.length !== b.length) {
            return false;
        }
        return crypto.timingSafeEqual(a, b);
    }
}
