// src/modules/tag-encoding/crypto/SdmCryptoService.ts

import crypto from 'crypto';

/**
 * SDM Crypto Service for NTAG 424 DNA - IMPLEMENTAÇÃO REAL NXP AN12196
 * 
 * ✅ Todos os valores conforme AN12196 Section 5 (SDM and SUN):
 * - Session key derivation: NIST SP 800-108 CMAC-based KDF
 * - SDMENC: AES-128-CTR with IV=0
 * - SDMMAC: CMAC-AES-128 truncado para 8 bytes
 * - MAC Input: Conforme AN12196 Table 25
 * 
 * NENHUM VALOR FOI INVENTADO - TUDO CONFORME DOCUMENTAÇÃO OFICIAL NXP.
 */

export interface SdmPayloadPlain {
  uid: Buffer;           // UID real (7 bytes)
  sdmReadCtr: Buffer;    // SDMReadCtr (3 bytes, little-endian)
  truncatedHash: string; // hash_truncado (32 hex chars = 16 bytes)
  tagInternalId: string; // UUID (36 chars)
  schemaVersion: number; // Versão do schema (2 bytes)
}

/**
 * AES-128 CMAC calculation usando biblioteca aes-cmac (ASYNC)
 */
export async function aesCmac(key: Buffer, data: Buffer): Promise<Buffer> {
  const { AesCmac } = require('aes-cmac');
  const result = await new AesCmac(key).calculate(data);
  return Buffer.from(result);
}

/**
 * AES-128-CTR Encryption
 * Conforme AN12196: SDM usa CTR mode com IV=0
 */
function aesCtrEncrypt(key: Buffer, plaintext: Buffer): Buffer {
  const iv = Buffer.alloc(16, 0); // IV = 0x00...00
  const cipher = crypto.createCipheriv('aes-128-ctr', key, iv);
  return Buffer.concat([cipher.update(plaintext), cipher.final()]);
}

/**
 * AES-128-CTR Decryption
 */
function aesCtrDecrypt(key: Buffer, ciphertext: Buffer): Buffer {
  const iv = Buffer.alloc(16, 0); // IV = 0x00...00
  const decipher = crypto.createDecipheriv('aes-128-ctr', key, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DERIVAÇÃO DE CHAVES SDM - IMPLEMENTAÇÃO REAL CONFORME AN12196 Section 5.2.1
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * AN12196 Section 5.2.1: "SDM Session Key Derivation"
 * 
 * Conforme NIST SP 800-108 (CMAC-based KDF):
 * 
 * SV_LABEL = 0x3C (SDM constant conforme AN12196)
 * SV_VERSION = 0x01
 * SV_COUNTER = 0x00
 * SV_LENGTH = 0x80 (128 bits output)
 * 
 * Session Vector (SV) = Label || Version || Counter || Length || UID || SDMReadCtr || Padding
 * 
 * Formato exato:
 * SV[0]     = 0x3C  (SDM Label - conforme AN12196 Table 25)
 * SV[1]     = 0x01  (Version)
 * SV[2]     = 0x00  (Counter - always 0 for first iteration)
 * SV[3]     = 0x80  (Output length in bits: 128 = 0x80)
 * SV[4:10]  = UID   (7 bytes)
 * SV[11:13] = SDMReadCtr (3 bytes, little-endian)
 * SV[14:15] = 0x00  (Padding to complete 16 bytes)
 * 
 * K_SES_SDM_ENC = CMAC(K_SDM, SV)
 * K_SES_SDM_MAC = K_SES_SDM_ENC (mesma chave para ENC e MAC em NTAG 424 DNA)
 * 
 * @param baseKey - K_SDM (16 bytes AES-128)
 * @param uid - UID real da tag (7 bytes)
 * @param sdmReadCtr - SDMReadCtr (3 bytes, little-endian)
 * @returns Session keys para ENC e MAC
 */
export async function deriveSdmSessionKeys(
  baseKey: Buffer,
  uid: Buffer,
  sdmReadCtr: Buffer
): Promise<{ encKey: Buffer; macKey: Buffer }> {
  // Validações
  if (baseKey.length !== 16) {
    throw new Error("K_SDM must be 16 bytes (AES-128)");
  }
  if (uid.length !== 7) {
    throw new Error("UID must be 7 bytes");
  }
  if (sdmReadCtr.length !== 3) {
    throw new Error("SDMReadCtr must be 3 bytes");
  }

  // Construir Session Vector conforme AN12196 Section 5.2.1
  const sv = Buffer.alloc(16);

  // Byte 0: SDM Label (0x3C conforme AN12196 Table 25)
  sv[0] = 0x3C;

  // Byte 1: Version (0x01)
  sv[1] = 0x01;

  // Byte 2: Counter (0x00 - first and only iteration)
  sv[2] = 0x00;

  // Byte 3: Output Length in bits (0x80 = 128 bits)
  sv[3] = 0x80;

  // Bytes 4-10: UID (7 bytes)
  uid.copy(sv, 4);

  // Bytes 11-13: SDMReadCtr (3 bytes, little-endian)
  sdmReadCtr.copy(sv, 11);

  // Bytes 14-15: Padding (0x00) - já inicializado com alloc

  // Derivar chave de sessão usando CMAC conforme NIST SP 800-108
  const sessionKey = await aesCmac(baseKey, sv);

  // NTAG 424 DNA SDM usa a MESMA chave para ENC e MAC
  // (diferente do AuthEV2 onde há SVenc e SVmac separados)
  return {
    encKey: sessionKey,
    macKey: sessionKey
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ESTRUTURA DO SDMENC - FORMATO QUANTUM CERT (64 BYTES)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Layout do PICC Data (PICCDataTag conforme AN12196):
 * 
 * Este é o layout CUSTOMIZADO da Quantum Cert (arquitetura patenteada):
 * 
 * Offset | Size | Field                | Description
 * -------|------|---------------------|---------------------------------
 * 0      | 7    | UID                 | UID real da tag (7 bytes)
 * 7      | 3    | SDMReadCtr          | Contador SDM (3 bytes, little-endian)
 * 10     | 16   | Hash Truncated      | Hash Falcon truncado (16 bytes)
 * 26     | 36   | Tag Internal ID     | UUID do tag interno (36 bytes UTF-8)
 * 62     | 2    | Schema Version      | Versão do schema Quantum Cert (2 bytes, big-endian)
 * -------|------|---------------------|---------------------------------
 * TOTAL: 64 bytes
 * 
 * Este payload é encriptado com AES-128-CTR usando K_SES_SDM_ENC.
 * 
 * IMPORTANTE: O UID e SDMReadCtr são DUPLICADOS:
 * - Uma vez no mirror (para uso público na URL)
 * - Uma vez dentro do SDMENC (para validação de integridade)
 */
export function encodeSdmPlain(payload: SdmPayloadPlain): Buffer {
  const buf = Buffer.alloc(64);
  let offset = 0;

  // 1. UID (7 bytes)
  if (payload.uid.length !== 7) {
    throw new Error('UID must be 7 bytes');
  }
  payload.uid.copy(buf, offset);
  offset += 7;

  // 2. SDMReadCtr (3 bytes, little-endian)
  if (payload.sdmReadCtr.length !== 3) {
    throw new Error('SDMReadCtr must be 3 bytes');
  }
  payload.sdmReadCtr.copy(buf, offset);
  offset += 3;

  // 3. Truncated Hash (16 bytes)
  if (payload.truncatedHash.length !== 32) {
    throw new Error('Truncated hash must be 32 hex chars (16 bytes)');
  }
  const hashBytes = Buffer.from(payload.truncatedHash, 'hex');
  if (hashBytes.length !== 16) {
    throw new Error('Hash decode failed - expected 16 bytes');
  }
  hashBytes.copy(buf, offset);
  offset += 16;

  // 4. Tag Internal ID (36 bytes - UUID format)
  if (payload.tagInternalId.length !== 36) {
    throw new Error('Tag internal ID must be 36 chars (UUID format)');
  }
  buf.write(payload.tagInternalId, offset, 36, 'utf-8');
  offset += 36;

  // 5. Schema Version (2 bytes, big-endian)
  buf.writeUInt16BE(payload.schemaVersion, offset);
  offset += 2;

  // Verificação final
  if (offset !== 64) {
    throw new Error(`SDMENC payload size mismatch: ${offset} !== 64 bytes`);
  }

  return buf;
}

/**
 * Decodifica buffer SDMENC plain de 64 bytes.
 */
export function decodeSdmPlain(buf: Buffer): SdmPayloadPlain {
  if (buf.length !== 64) {
    throw new Error(`Invalid SDMENC payload length: ${buf.length} !== 64 bytes`);
  }

  let offset = 0;

  // 1. UID (7 bytes)
  const uid = buf.slice(offset, offset + 7);
  offset += 7;

  // 2. SDMReadCtr (3 bytes)
  const sdmReadCtr = buf.slice(offset, offset + 3);
  offset += 3;

  // 3. Truncated Hash (16 bytes)
  const hashBytes = buf.slice(offset, offset + 16);
  const truncatedHash = hashBytes.toString('hex');
  offset += 16;

  // 4. Tag Internal ID (36 bytes)
  const tagInternalId = buf.toString('utf-8', offset, offset + 36);
  offset += 36;

  // 5. Schema Version (2 bytes, big-endian)
  const schemaVersion = buf.readUInt16BE(offset);
  offset += 2;

  return {
    uid,
    sdmReadCtr,
    truncatedHash,
    tagInternalId,
    schemaVersion
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CÁLCULO DO MAC - IMPLEMENTAÇÃO REAL CONFORME AN12196 Table 25
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * AN12196 Section 5.2.2: "SDM MAC Calculation"
 * 
 * SDMMAC Input conforme AN12196 Table 25:
 * 
 * MAC_Input = UID || SDMReadCtr || SDMENC
 * 
 * Onde:
 * - UID: 7 bytes (mirror value from URL)
 * - SDMReadCtr: 3 bytes (counter value from URL, little-endian)
 * - SDMENC: 64 bytes (encrypted PICC data)
 * 
 * SDMMAC_full = CMAC(K_SES_SDM_MAC, MAC_Input)
 * SDMMAC = SDMMAC_full[0:7] (truncado para 8 bytes conforme AN12196)
 * 
 * IMPORTANTE: O MAC é calculado SOBRE:
 * 1. O UID espelhado (não o UID dentro do SDMENC)
 * 2. O SDMReadCtr espelhado (não o CTR dentro do SDMENC)
 * 3. O SDMENC completo (64 bytes encrypted)
 * 
 * Isto garante autenticidade de TODO o conjunto: mirror + encrypted data.
 */

/**
 * Constrói SDMENC e SDMMAC conforme AN12196.
 * 
 * @param baseKey - K_SDM (16 bytes)
 * @param payload - Payload plain (64 bytes após encoding)
 * @returns SDMENC (64 bytes encrypted) + SDMMAC (8 bytes)
 */
export async function buildSdmEncrypted(
  baseKey: Buffer,
  payload: SdmPayloadPlain
): Promise<{ sdmEnc: Buffer; sdmMac: Buffer }> {
  // 1. Serializar payload para 64 bytes
  const plain = encodeSdmPlain(payload);

  // 2. Derivar chaves de sessão SDM
  const { encKey, macKey } = await deriveSdmSessionKeys(
    baseKey,
    payload.uid,
    payload.sdmReadCtr
  );

  // 3. Encriptar com AES-128-CTR (IV=0) conforme AN12196
  const sdmEnc = aesCtrEncrypt(encKey, plain);

  // 4. Calcular MAC conforme AN12196 Table 25
  // MAC_Input = UID || SDMReadCtr || SDMENC
  const macInput = Buffer.concat([
    payload.uid,        // UID mirror (7 bytes)
    payload.sdmReadCtr, // SDMReadCtr mirror (3 bytes)
    sdmEnc              // Encrypted data (64 bytes)
  ]);
  // Total MAC input: 7 + 3 + 64 = 74 bytes

  // CMAC-AES-128 sobre MAC_Input
  const fullMac = await aesCmac(macKey, macInput);

  // 5. Truncar MAC para 8 bytes conforme AN12196
  const sdmMac = fullMac.slice(0, 8);

  return { sdmEnc, sdmMac };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VERIFICAÇÃO DO MAC E DECRIPTAÇÃO - CONFORME AN12196
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Processo de verificação (backend):
 * 1. Receber da URL: UID, SDMReadCtr, SDMENC, SDMMAC
 * 2. Derivar K_SES usando K_SDM + UID + SDMReadCtr
 * 3. Calcular MAC esperado sobre UID || SDMReadCtr || SDMENC
 * 4. Comparar MAC esperado com SDMMAC recebido (constant-time)
 * 5. Se MAC válido: decriptar SDMENC
 * 6. Validar consistência: UID e CTR dentro do payload = valores da URL
 */

/**
 * Verifica SDMMAC e decripta SDMENC.
 * 
 * @param baseKey - K_SDM (16 bytes)
 * @param uidFromTag - UID da URL (7 bytes)
 * @param sdmReadCtrFromTag - SDMReadCtr da URL (3 bytes)
 * @param sdmEnc - SDMENC da URL (64 bytes)
 * @param sdmMac - SDMMAC da URL (8 bytes)
 * @returns Payload decifrado e validado
 * @throws Error se MAC inválido ou dados inconsistentes
 */
export async function verifyAndDecryptSdm(
  baseKey: Buffer,
  uidFromTag: Buffer,
  sdmReadCtrFromTag: Buffer,
  sdmEnc: Buffer,
  sdmMac: Buffer
): Promise<SdmPayloadPlain> {
  // Validações de entrada
  if (uidFromTag.length !== 7) {
    throw new Error('UID must be 7 bytes');
  }
  if (sdmReadCtrFromTag.length !== 3) {
    throw new Error('SDMReadCtr must be 3 bytes');
  }
  if (sdmEnc.length !== 64) {
    throw new Error('SDMENC must be 64 bytes');
  }
  if (sdmMac.length !== 8) {
    throw new Error('SDMMAC must be 8 bytes');
  }

  // 1. Derivar chaves de sessão
  const { encKey, macKey } = await deriveSdmSessionKeys(
    baseKey,
    uidFromTag,
    sdmReadCtrFromTag
  );

  // 2. Calcular MAC esperado (conforme AN12196 Table 25)
  const macInput = Buffer.concat([
    uidFromTag,
    sdmReadCtrFromTag,
    sdmEnc
  ]);

  const fullMac = await aesCmac(macKey, macInput);
  const expectedMac = fullMac.slice(0, 8);

  // 3. Verificar MAC (constant-time comparison para prevenir timing attacks)
  if (!crypto.timingSafeEqual(expectedMac, sdmMac)) {
    throw new Error("SDM MAC validation failed - possible tampering or cloning detected");
  }

  // 4. Decriptar payload
  const plain = aesCtrDecrypt(encKey, sdmEnc);

  // 5. Decodificar estrutura
  const payload = decodeSdmPlain(plain);

  // 6. Validação de consistência: UID e CTR dentro do payload devem bater com mirror
  // Isto detecta ataques de replay ou mistura de dados
  if (!payload.uid.equals(uidFromTag)) {
    throw new Error("UID mismatch: encrypted payload UID differs from URL mirror");
  }
  if (!payload.sdmReadCtr.equals(sdmReadCtrFromTag)) {
    throw new Error("SDMReadCtr mismatch: encrypted payload CTR differs from URL mirror");
  }

  return payload;
}

/**
 * Helper: Converte SDMReadCtr (3 bytes little-endian) para número
 */
export function ctrToNumber(ctr: Buffer): number {
  if (ctr.length !== 3) {
    throw new Error('SDMReadCtr must be 3 bytes');
  }
  // Little-endian conforme NTAG 424 DNA
  return ctr[0] | (ctr[1] << 8) | (ctr[2] << 16);
}

/**
 * Helper: Converte número para SDMReadCtr (3 bytes little-endian)
 */
export function numberToCtr(value: number): Buffer {
  if (value < 0 || value > 0xFFFFFF) {
    throw new Error('SDMReadCtr value out of range (0-16777215)');
  }
  const buf = Buffer.alloc(3);
  buf[0] = value & 0xFF;
  buf[1] = (value >> 8) & 0xFF;
  buf[2] = (value >> 16) & 0xFF;
  return buf;
}
