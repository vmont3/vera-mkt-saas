// src/modules/tag-encoding/crypto/Ev2AuthService.ts

import crypto from 'crypto';
import { aesCmac } from './SdmCryptoService';

/**
 * AuthenticateEV2 Service for NTAG 424 DNA
 * Baseado em AN12196 (NTAG 424 DNA and NTAG 424 DNA TagTamper features and hints)
 * 
 * Implementa o fluxo completo de autenticação AES EV2 com derivação de chaves de sessão.
 */

export interface Ev2SessionKeys {
    encKey: Buffer;
    macKey: Buffer;
    ti: Buffer;    // Transaction Identifier (4 bytes)
    rndA: Buffer;  // PCD Random (16 bytes)
    rndB: Buffer;  // PICC Random (16 bytes)
}

export interface Ev2AuthConfig {
    baseKey: Buffer;  // K_APP ou K_SDM (16 bytes AES-128)
    keyNo: number;    // número da chave na aplicação (0..4)
}
function aesCbcEncrypt(key: Buffer, plaintext: Buffer): Buffer {
    const iv = Buffer.alloc(16, 0); // IV = 0x00...00
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    cipher.setAutoPadding(false); // No padding for EV2
    return Buffer.concat([cipher.update(plaintext), cipher.final()]);
}

/**
 * AES-128-CBC Decryption with IV=0
 */
function aesCbcDecrypt(key: Buffer, ciphertext: Buffer): Buffer {
    const iv = Buffer.alloc(16, 0); // IV = 0x00...00
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    decipher.setAutoPadding(false); // No padding for EV2
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Deriva ENC e MAC session keys conforme NIST SP 800-108 (CMAC-based KDF)
 * 
 * Conforme AN12196:
 * - SV = 0xA5 || 0x5A || Counter || 0x00 || TI || PDcap2 || PCDcap2 || padding
 * - KSesAuthENC = CMAC(key, 0x01 || SV)
 * - KSesAuthMAC = CMAC(key, 0x02 || SV)
 * 
 * Simplificação: usar TI como base da derivação (ajustar conforme necessário)
 */
async function deriveEv2SessionKeys(
    ti: Buffer,
    rndA: Buffer,
    rndB: Buffer,
    baseKey: Buffer
): Promise<Ev2SessionKeys> {
    if (baseKey.length !== 16) {
        throw new Error("baseKey must be 16 bytes");
    }
    if (ti.length !== 4) {
        throw new Error("TI must be 4 bytes");
    }

    // Session Vector conforme NIST SP 800-108
    // SV = 0xA5 || 0x5A || 0x01 || 0x00 || 0x80 || TI || PDcap2(6) || PCDcap2(6)
    // Simplificado: usar apenas 0xA5 || 0x5A || padding || TI
    const sv = Buffer.alloc(16);
    sv[0] = 0xA5;
    sv[1] = 0x5A;
    sv[2] = 0x01; // Counter=1
    sv[3] = 0x00;
    sv[4] = 0x80; // Output length (128 bits)
    ti.copy(sv, 5); // TI (4 bytes)
    // Remaining bytes are 0x00 (padding)

    // KSesAuthENC = CMAC(baseKey, 0x01 || SV)
    const svEnc = Buffer.concat([Buffer.from([0x01]), sv]);
    const encKey = (await aesCmac(baseKey, svEnc)).slice(0, 16);

    // KSesAuthMAC = CMAC(baseKey, 0x02 || SV)
    const svMac = Buffer.concat([Buffer.from([0x02]), sv]);
    const macKey = (await aesCmac(baseKey, svMac)).slice(0, 16);

    return { encKey, macKey, ti, rndA, rndB };
}

/**
 * Rotação à esquerda de 1 byte (usado em AuthEV2)
 */
function rotateLeft(buffer: Buffer): Buffer {
    return Buffer.concat([buffer.slice(1), buffer.slice(0, 1)]);
}

/**
 * Fluxo completo do AuthenticateEV2First:
 * 
 * 1. PCD → PICC: AuthEV2First [KeyNo, PCDcap2]
 * 2. PICC → PCD: TI (4) || RndB_enc (16)
 * 3. PCD decripta RndB, gera RndA
 * 4. PCD → PICC: AuthEV2NonFirst [RndA (16) || RndB' (16)] encrypted
 * 5. PICC → PCD: TI' (4) || PDcap2_enc (6) || RndA'_enc (16)
 * 6. PCD valida RndA'
 * 7. Deriva KSesAuthENC e KSesAuthMAC
 * 
 * @param session - Objeto com método transceive para enviar/receber APDUs
 * @param config - Configuração de autenticação (chave base + número da chave)
 * @returns Session keys derivadas
 */
export async function authenticateEv2First(
    session: { transceive: (apdu: Uint8Array) => Promise<Uint8Array> },
    config: Ev2AuthConfig
): Promise<Ev2SessionKeys> {
    const { baseKey, keyNo } = config;

    if (baseKey.length !== 16) {
        throw new Error('Base key must be 16 bytes (AES-128)');
    }

    // ===== STEP 1: Send AuthEV2First =====
    const pcdCap2 = 0x00; // No additional capabilities
    const apduFirst = buildAuthEv2FirstApdu(keyNo, pcdCap2);

    console.log('[AuthEV2] Sending AuthEV2First...');
    const respFirst = Buffer.from(await session.transceive(apduFirst));

    // Check Status Word (last 2 bytes)
    if (respFirst.length < 2) {
        throw new Error('AuthEV2First response too short');
    }

    const sw1 = respFirst[respFirst.length - 2];
    const sw2 = respFirst[respFirst.length - 1];

    // Accept 0x91AF (more data) or 0x9000 (success)
    if (!(sw1 === 0x91 && sw2 === 0xAF) && !(sw1 === 0x90 && sw2 === 0x00)) {
        throw new Error(`AuthEV2First failed: SW=${sw1.toString(16).padStart(2, '0')}${sw2.toString(16).padStart(2, '0')}`);
    }

    const dataFirst = respFirst.slice(0, respFirst.length - 2);

    // ===== STEP 2: Parse TI + RndB_enc =====
    if (dataFirst.length < 20) {
        throw new Error('AuthEV2First response data too short (expected TI + RndB_enc)');
    }

    const ti = dataFirst.slice(0, 4);
    const rndBEnc = dataFirst.slice(4, 20);

    console.log(`[AuthEV2] TI: ${ti.toString('hex')}`);

    // ===== STEP 3: Decrypt RndB =====
    const rndB = aesCbcDecrypt(baseKey, rndBEnc).slice(0, 16);

    // ===== STEP 4: Generate RndA and prepare response =====
    const rndA = crypto.randomBytes(16);
    const rndBRot = rotateLeft(rndB);

    // Response: RndA || RndB'
    const plainResponse = Buffer.concat([rndA, rndBRot]);
    const encResponse = aesCbcEncrypt(baseKey, plainResponse);

    // ===== STEP 5: Send AuthEV2NonFirst =====
    const apduNonFirst = buildAuthEv2NonFirstApdu(new Uint8Array(encResponse));

    console.log('[AuthEV2] Sending AuthEV2NonFirst...');
    const respNonFirst = Buffer.from(await session.transceive(apduNonFirst));

    if (respNonFirst.length < 2) {
        throw new Error('AuthEV2NonFirst response too short');
    }

    const sw21 = respNonFirst[respNonFirst.length - 2];
    const sw22 = respNonFirst[respNonFirst.length - 1];

    if (!(sw21 === 0x90 && sw22 === 0x00)) {
        throw new Error(`AuthEV2NonFirst failed: SW=${sw21.toString(16).padStart(2, '0')}${sw22.toString(16).padStart(2, '0')}`);
    }

    const dataNonFirst = respNonFirst.slice(0, respNonFirst.length - 2);

    // ===== STEP 6: Validate RndA' =====
    // Response: TI' (4) || PDcap2_enc (6) || RndA'_enc (remaining)
    if (dataNonFirst.length < 10) {
        throw new Error('AuthEV2NonFirst response too short');
    }

    const tiPrime = dataNonFirst.slice(0, 4);
    const pdCap2Enc = dataNonFirst.slice(4, 10);

    // Remaining data is encrypted RndA'
    const remainingEnc = dataNonFirst.slice(10);

    // Decrypt to get RndA'
    let decrypted: Buffer;
    if (remainingEnc.length >= 16) {
        // Decrypt first 16 bytes (or all if exactly 16)
        const blockToDecrypt = remainingEnc.slice(0, Math.ceil(remainingEnc.length / 16) * 16);
        decrypted = aesCbcDecrypt(baseKey, blockToDecrypt);
    } else {
        throw new Error('AuthEV2NonFirst encrypted data too short');
    }

    const rndARotReceived = decrypted.slice(0, 16);
    const rndARotExpected = rotateLeft(rndA);

    if (!rndARotReceived.equals(rndARotExpected)) {
        throw new Error('AuthEV2 mutual authentication failed: RndA mismatch');
    }

    console.log('[AuthEV2] Mutual authentication successful');

    // ===== STEP 7: Derive session keys =====
    const sessionKeys = await deriveEv2SessionKeys(ti, rndA, rndB, baseKey);

    console.log('[AuthEV2] Session keys derived');
    console.log(`[AuthEV2] ENC Key: ${sessionKeys.encKey.toString('hex')}`);
    console.log(`[AuthEV2] MAC Key: ${sessionKeys.macKey.toString('hex')}`);

    return sessionKeys;
}

/**
 * Helper: Build AuthEV2First APDU
 */
function buildAuthEv2FirstApdu(keyNo: number, pcdCap2: number = 0x00): Uint8Array {
    return new Uint8Array([
        0x90, // CLA
        0x71, // INS: AuthenticateEV2First
        0x00, // P1
        0x00, // P2
        0x02, // Lc
        keyNo,
        pcdCap2,
        0x00  // Le
    ]);
}

/**
 * Helper: Build AuthEV2NonFirst APDU
 */
function buildAuthEv2NonFirstApdu(encData: Uint8Array): Uint8Array {
    const header = new Uint8Array([
        0x90, // CLA
        0xAF, // INS: AuthenticateEV2NonFirst (Additional Frame)
        0x00, // P1
        0x00, // P2
        encData.length // Lc
    ]);

    const apdu = new Uint8Array(header.length + encData.length + 1);
    apdu.set(header);
    apdu.set(encData, header.length);
    apdu[apdu.length - 1] = 0x00; // Le

    return apdu;
}
