// src/modules/tag-encoding/util/CryptoUtils.ts

import crypto from "crypto";

/**
 * Utilitários Criptográficos para NTAG 424 DNA
 * 
 * Implementa algoritmos necessários para:
 * - AuthEV2 (challenge-response)
 * - Derivação de chaves de sessão
 * - CMAC (Cipher-based MAC)
 * - AES-128 encryption/decryption
 * - CRC32 para ChangeKey
 */

/**
 * Deriva chaves de sessão para AuthEV2
 * 
 * @param rndA Random A (16 bytes) gerado pelo PCD (leitor)
 * @param rndB Random B (16 bytes) recebido do PICC (tag)
 * @param masterKey Chave mestre (16 bytes)
 * @returns Session keys {encKey, macKey}
 */
export function deriveSessionKeys(
    rndA: Buffer,
    rndB: Buffer,
    masterKey: Buffer
): { encKey: Buffer; macKey: Buffer } {
    if (rndA.length !== 16 || rndB.length !== 16 || masterKey.length !== 16) {
        throw new Error("RndA, RndB and masterKey must be 16 bytes each");
    }

    // Session Vector (SV) para EV2
    // SV = 0x5A || RndA[14..15] || 0x00 || RndB[14..15] || RndA[6..13] || RndB[6..13]
    const sv = Buffer.alloc(32);
    sv[0] = 0x5a;
    rndA.copy(sv, 1, 14, 16); // RndA[14..15]
    sv[3] = 0x00;
    rndB.copy(sv, 4, 14, 16); // RndB[14..15]
    rndA.copy(sv, 6, 6, 14);  // RndA[6..13]
    rndB.copy(sv, 14, 6, 14); // RndB[6..13]

    // CMAC-based derivation
    // SesAuthENCKey = CMAC(masterKey, SV[0..15])
    // SesAuthMACKey = CMAC(masterKey, SV[16..31])

    const encKey = cmacAes128(masterKey, sv.slice(0, 16));
    const macKey = cmacAes128(masterKey, sv.slice(16, 32));

    return {
        encKey: encKey.slice(0, 16), // Use first 16 bytes
        macKey: macKey.slice(0, 16), // Use first 16 bytes
    };
}

/**
 * Calcula CMAC (Cipher-based Message Authentication Code) usando AES-128
 * 
 * @param key Chave AES-128 (16 bytes)
 * @param data Dados para autenticar
 * @returns CMAC (16 bytes)
 */
export function cmacAes128(key: Buffer, data: Buffer): Buffer {
    if (key.length !== 16) {
        throw new Error("Key must be 16 bytes for AES-128");
    }

    // Node.js não tem CMAC built-in, então implementamos manualmente
    // Baseado em NIST SP 800-38B

    const cipher = crypto.createCipheriv("aes-128-ecb", key, null);
    cipher.setAutoPadding(false);

    // Subkeys K1 e K2
    const L = cipher.update(Buffer.alloc(16, 0));
    const K1 = leftShift(L);
    if (L[0] & 0x80) {
        K1[15] ^= 0x87; // XOR with Rb constant
    }

    const K2 = leftShift(K1);
    if (K1[0] & 0x80) {
        K2[15] ^= 0x87;
    }

    // Padding and XOR
    const blockCount = Math.ceil(data.length / 16) || 1;
    const lastBlock = Buffer.alloc(16, 0);

    if (data.length > 0 && data.length % 16 === 0) {
        // Complete block - XOR with K1
        data.copy(lastBlock, 0, data.length - 16);
        for (let i = 0; i < 16; i++) {
            lastBlock[i] ^= K1[i];
        }
    } else {
        // Incomplete block - Pad and XOR with K2
        const remaining = data.length % 16;
        if (remaining > 0) {
            data.copy(lastBlock, 0, data.length - remaining);
        }
        lastBlock[remaining] = 0x80; // Padding bit
        for (let i = 0; i < 16; i++) {
            lastBlock[i] ^= K2[i];
        }
    }

    // CMAC calculation
    let mac = Buffer.alloc(16, 0);

    for (let i = 0; i < blockCount - 1; i++) {
        const block = data.slice(i * 16, (i + 1) * 16);
        for (let j = 0; j < 16; j++) {
            mac[j] ^= block[j];
        }
        const cipher2 = crypto.createCipheriv("aes-128-ecb", key, null);
        cipher2.setAutoPadding(false);
        mac = cipher2.update(mac);
    }

    // Last block
    for (let i = 0; i < 16; i++) {
        mac[i] ^= lastBlock[i];
    }

    const cipherFinal = crypto.createCipheriv("aes-128-ecb", key, null);
    cipherFinal.setAutoPadding(false);
    mac = cipherFinal.update(mac);

    return mac;
}

/**
 * Encripta dados usando AES-128 CBC
 * 
 * @param key Chave AES-128 (16 bytes)
 * @param iv Initialization Vector (16 bytes)
 * @param data Dados para encriptar
 * @returns Dados encriptados
 */
export function aes128Encrypt(key: Buffer, iv: Buffer, data: Buffer): Buffer {
    if (key.length !== 16) {
        throw new Error("Key must be 16 bytes for AES-128");
    }
    if (iv.length !== 16) {
        throw new Error("IV must be 16 bytes");
    }

    const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
    cipher.setAutoPadding(false); // NTAG 424 uses manual padding

    return Buffer.concat([cipher.update(data), cipher.final()]);
}

/**
 * Decripta dados usando AES-128 CBC
 * 
 * @param key Chave AES-128 (16 bytes)
 * @param iv Initialization Vector (16 bytes)
 * @param data Dados para decriptar
 * @returns Dados decriptados
 */
export function aes128Decrypt(key: Buffer, iv: Buffer, data: Buffer): Buffer {
    if (key.length !== 16) {
        throw new Error("Key must be 16 bytes for AES-128");
    }
    if (iv.length !== 16) {
        throw new Error("IV must be 16 bytes");
    }

    const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
    decipher.setAutoPadding(false);

    return Buffer.concat([decipher.update(data), decipher.final()]);
}

/**
 * Calcula CRC32 (usado para ChangeKey command)
 * 
 * @param data Dados para calcular CRC
 * @returns CRC32 (4 bytes, little-endian)
 */
export function crc32(data: Buffer): Buffer {
    const polynomial = 0xedb88320;
    let crc = 0xffffffff;

    for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let j = 0; j < 8; j++) {
            if (crc & 1) {
                crc = (crc >>> 1) ^ polynomial;
            } else {
                crc = crc >>> 1;
            }
        }
    }

    crc = crc ^ 0xffffffff;

    // Return as little-endian 4-byte buffer
    const result = Buffer.alloc(4);
    result.writeUInt32LE(crc >>> 0, 0);
    return result;
}

/**
 * Gera bytes aleatórios criptograficamente seguros
 * 
 * @param length Número de bytes
 * @returns Buffer com bytes aleatórios
 */
export function randomBytes(length: number): Buffer {
    return crypto.randomBytes(length);
}

/**
 * Left shift de um buffer (usado em CMAC)
 * 
 * @param buffer Buffer para deslocar
 * @returns Buffer deslocado 1 bit para esquerda
 */
function leftShift(buffer: Buffer): Buffer {
    const result = Buffer.alloc(buffer.length);
    let carry = 0;

    for (let i = buffer.length - 1; i >= 0; i--) {
        const b = buffer[i];
        result[i] = ((b << 1) | carry) & 0xff;
        carry = (b & 0x80) ? 1 : 0;
    }

    return result;
}

/**
 * Rota buffer para esquerda (usado em AuthEV2)
 * 
 * @param buffer Buffer para rotar
 * @param positions Número de bytes para rotar
 * @returns Buffer rotado
 */
export function rotateLeft(buffer: Buffer, positions: number): Buffer {
    const len = buffer.length;
    positions = positions % len;

    return Buffer.concat([
        buffer.slice(positions),
        buffer.slice(0, positions),
    ]);
}

/**
 * XOR de dois buffers
 * 
 * @param a Buffer A
 * @param b Buffer B
 * @returns A XOR B
 */
export function xorBuffers(a: Buffer, b: Buffer): Buffer {
    if (a.length !== b.length) {
        throw new Error("Buffers must have same length for XOR");
    }

    const result = Buffer.alloc(a.length);
    for (let i = 0; i < a.length; i++) {
        result[i] = a[i] ^ b[i];
    }

    return result;
}

/**
 * Aplica padding PKCS#7
 * 
 * @param data Dados para pad
 * @param blockSize Tamanho do bloco (padrão 16 para AES)
 * @returns Dados com padding
 */
export function pkcs7Pad(data: Buffer, blockSize: number = 16): Buffer {
    const paddingLength = blockSize - (data.length % blockSize);
    const padding = Buffer.alloc(paddingLength, paddingLength);
    return Buffer.concat([data, padding]);
}

/**
 * Remove padding PKCS#7
 * 
 * @param data Dados com padding
 * @returns Dados sem padding
 */
export function pkcs7Unpad(data: Buffer): Buffer {
    const paddingLength = data[data.length - 1];

    // Validate padding
    for (let i = 0; i < paddingLength; i++) {
        if (data[data.length - 1 - i] !== paddingLength) {
            throw new Error("Invalid PKCS#7 padding");
        }
    }

    return data.slice(0, data.length - paddingLength);
}
