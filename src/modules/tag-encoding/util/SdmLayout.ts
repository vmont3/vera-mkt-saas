// src/modules/tag-encoding/util/SdmLayout.ts

/**
 * Configuração de layout SDM (Secure Dynamic Messaging) para NTAG 424 DNA
 * 
 * Define os offsets e comprimentos dos campos dinâmicos na URL de verificação
 */
export interface SdmLayout {
    urlBase: string;          // ex: "https://api.quantumcert.com/v1/verify-tag"
    sdmEncOffset: number;     // Offset do campo encriptado (UID + meta)
    sdmEncLength: number;     // Comprimento do campo encriptado (64 bytes padrão Quantum Cert)
    sdmReadCtrOffset: number; // Offset do contador de leituras
    sdmMacOffset: number;     // Offset do MAC
    sdmMacInputOffset: number;// Offset inicial para cálculo do MAC
}

/**
 * Layout padrão Quantum Cert
 * 
 * Payload encriptado de 64 bytes contendo:
 * - UID (7 bytes)
 * - SDMReadCtr (3 bytes)
 * - hash_truncado (16 bytes)
 * - id_tag_interno (16 bytes)
 * - metadata (22 bytes)
 */
export const QUANTUM_CERT_DEFAULT_LAYOUT: Partial<SdmLayout> = {
    sdmEncLength: 64,  // 64 bytes de payload encriptado (configuração patenteada)
    // Offsets serão calculados dinamicamente baseado no tamanho da URL
};

/**
 * Monta o "template" de URL com placeholders genéricos.
 * A tag vai gerar os valores reais para d (data), r (read counter), m (MAC).
 * 
 * Os placeholders @D@, @R@, @M@ serão substituídos pelos valores reais
 * gerados pela tag durante a leitura NFC.
 */
export function buildSdmUrlTemplate(layout: SdmLayout): string {
    // A URL final terá o formato:
    //   https://.../verify-tag?d=<sdm_enc>&r=<ctr>&m=<mac>
    // Os offsets SDM são configurados no arquivo NDEF, não na string em si,
    // mas o template da URL deve conter os parâmetros esperados.
    const base = layout.urlBase.replace(/\?$/, "");
    return `${base}?d=@D@&r=@R@&m=@M@`;
}

/**
 * Calcula os offsets SDM automaticamente baseado na URL base
 * 
 * @param urlBase URL base (ex: "https://api.quantumcert.com/v1/verify-tag")
 * @param encLength Comprimento do payload encriptado (padrão 64 bytes)
 * @returns Layout completo com offsets calculados
 */
export function calculateSdmOffsets(
    urlBase: string,
    encLength: number = 64
): SdmLayout {
    // Formato da URL: baseUrl?d=<ENC>&r=<CTR>&m=<MAC>
    const baseWithParam = `${urlBase.replace(/\?$/, "")}?d=`;

    // Offset do campo encriptado (após "?d=")
    const sdmEncOffset = baseWithParam.length;

    // Offset do contador (após o campo enc + "&r=")
    // Campo ENC em hex = encLength * 2 caracteres
    const sdmReadCtrOffset = sdmEncOffset + (encLength * 2) + 3; // +3 para "&r="

    // Offset do MAC (após contador + "&m=")
    // Contador em hex = 6 caracteres (3 bytes)
    const sdmMacOffset = sdmReadCtrOffset + 6 + 3; // +3 para "&m="

    // MAC Input Offset (início da URL para cálculo do MAC)
    const sdmMacInputOffset = 0;

    return {
        urlBase,
        sdmEncOffset,
        sdmEncLength: encLength,
        sdmReadCtrOffset,
        sdmMacOffset,
        sdmMacInputOffset,
    };
}

/**
 * Valida um layout SDM
 */
export function validateSdmLayout(layout: SdmLayout): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!layout.urlBase || layout.urlBase.length === 0) {
        errors.push("URL base é obrigatória");
    }

    if (layout.sdmEncLength < 16 || layout.sdmEncLength > 256) {
        errors.push("sdmEncLength deve estar entre 16 e 256 bytes");
    }

    if (layout.sdmEncOffset < 0) {
        errors.push("sdmEncOffset deve ser >= 0");
    }

    if (layout.sdmReadCtrOffset <= layout.sdmEncOffset) {
        errors.push("sdmReadCtrOffset deve ser maior que sdmEncOffset");
    }

    if (layout.sdmMacOffset <= layout.sdmReadCtrOffset) {
        errors.push("sdmMacOffset deve ser maior que sdmReadCtrOffset");
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
