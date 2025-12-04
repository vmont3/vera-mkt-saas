// src/modules/tag-encoding/util/NdefBuilder.ts

import { SdmLayout } from "./SdmLayout";
import { buildSdmUrlTemplate } from "./SdmLayout";

/**
 * Constrói um payload NDEF simples contendo um único registro URI
 * com a URL da Quantum Cert + parâmetros SDM.
 * 
 * Segue especificação NFC Forum NDEF (NFC Data Exchange Format)
 */
export function buildNdefForQuantumCert(layout: SdmLayout): Uint8Array {
    const url = buildSdmUrlTemplate(layout);

    // NDEF URI Record (simplificado):
    // | TNF=0x01 (Well-known) | Type="U" (URI) |
    // Primeiro byte do payload: URI Identifier Code (0x00 = no prefix)
    const uriBytes = Buffer.from(url, "utf8");
    const payload = Buffer.alloc(uriBytes.length + 1);
    payload[0] = 0x00; // "no prefix" - URL completa
    uriBytes.copy(payload, 1);

    const TYPE_U = Buffer.from("U", "utf8");

    // Record Header Byte:
    // MB (Message Begin) = 1
    // ME (Message End) = 1
    // CF (Chunk Flag) = 0
    // SR (Short Record) = 1
    // IL (ID Length present) = 0
    // TNF (Type Name Format) = 001 (Well-known)
    // = 0b11010001 = 0xD1
    const recordHeader = 0xD1;
    const typeLength = TYPE_U.length;
    const payloadLength = payload.length;

    // Estrutura do NDEF Record:
    // [Header][Type Length][Payload Length][Type][Payload]
    const ndef = Buffer.alloc(3 + typeLength + payloadLength);
    ndef[0] = recordHeader;
    ndef[1] = typeLength;
    ndef[2] = payloadLength;
    TYPE_U.copy(ndef, 3);
    payload.copy(ndef, 3 + typeLength);

    return new Uint8Array(ndef);
}

/**
 * Constrói um NDEF Message completo com TLV (Type-Length-Value) wrapper
 * para gravar no arquivo NDEF da tag.
 * 
 * Usado para NTAG 424 DNA File 02 (NDEF File)
 */
export function buildNdefMessageWithTlv(layout: SdmLayout): Uint8Array {
    const ndefRecord = buildNdefForQuantumCert(layout);

    // TLV Structure:
    // [Type=0x03 (NDEF Message)][Length][NDEF Record][Terminator=0xFE]
    const tlvType = 0x03; // NDEF Message TLV
    const tlvLength = ndefRecord.length;
    const tlvTerminator = 0xFE;

    const tlv = Buffer.alloc(2 + tlvLength + 1);
    tlv[0] = tlvType;
    tlv[1] = tlvLength;
    Buffer.from(ndefRecord).copy(tlv, 2);
    tlv[tlv.length - 1] = tlvTerminator;

    return new Uint8Array(tlv);
}

/**
 * Calcula o tamanho necessário do arquivo NDEF para acomodar a URL
 */
export function calculateNdefFileSize(layout: SdmLayout): number {
    const ndefMessage = buildNdefMessageWithTlv(layout);

    // Adiciona margem de segurança (16 bytes)
    // NTAG 424 DNA suporta tamanhos padrão: 256, 512, 1024 bytes
    const requiredSize = ndefMessage.length + 16;

    if (requiredSize <= 256) return 256;
    if (requiredSize <= 512) return 512;
    return 1024;
}

/**
 * Valida se a URL cabe no tamanho de arquivo NDEF especificado
 */
export function validateNdefSize(layout: SdmLayout, fileSize: number): boolean {
    const required = calculateNdefFileSize(layout);
    return fileSize >= required;
}

/**
 * Utilitário para debug: converte NDEF em string legível
 */
export function ndefToDebugString(ndef: Uint8Array): string {
    const hex = Buffer.from(ndef).toString("hex").toUpperCase();
    const ascii = Buffer.from(ndef).toString("ascii").replace(/[^\x20-\x7E]/g, ".");

    return `NDEF (${ndef.length} bytes):\nHEX: ${hex}\nASCII: ${ascii}`;
}
