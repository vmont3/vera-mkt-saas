const { NFC } = require('nfc-pcsc');
const crypto = require('crypto');

/**
 * Script de Gravação NTAG 424 DNA - Quantum Cert
 * 
 * Este script:
 * 1. Conecta ao leitor ACR122U
 * 2. Detecta a tag NTAG 424 DNA
 * 3. Autentica com chaves padrão de fábrica
 * 4. Troca as chaves para chaves seguras
 * 5. Habilita Random ID e LRP
 * 6. Configura SDM (Secure Dynamic Messaging)
 * 7. Grava a URL de verificação no NDEF
 */

// ========== CONFIGURAÇÃO ==========
const CONFIG = {
    // URL base para verificação (Quantum Cert)
    baseUrl: 'https://api.quantumcert.com/v1/verify-tag',

    // Chaves padrão de fábrica (NTAG 424 DNA vem com todas as chaves em 0x00)
    defaultKeys: {
        KEY_0: Buffer.alloc(16, 0x00), // K_APP
        KEY_1: Buffer.alloc(16, 0x00), // K_SDM
        KEY_2: Buffer.alloc(16, 0x00), // K_NDEF
        KEY_3: Buffer.alloc(16, 0x00), // K_PROT
        KEY_4: Buffer.alloc(16, 0x00), // K_AUTH
    },

    // Chaves novas (TESTE - Em produção, virão do AWS KMS)
    newKeys: {
        KEY_0: crypto.randomBytes(16), // K_APP
        KEY_1: crypto.randomBytes(16), // K_SDM
        KEY_2: crypto.randomBytes(16), // K_NDEF
        KEY_3: crypto.randomBytes(16), // K_PROT
        KEY_4: crypto.randomBytes(16), // K_AUTH
    },

    // Configuração SDM
    sdm: {
        encOffset: 47,
        encLength: 64,
        readCtrOffset: 178,
        macOffset: 187,
        macInputOffset: 47
    }
};

// ========== COMANDOS APDU NTAG 424 DNA ==========
const APDU = {
    // Seleção de aplicação
    SELECT_APP: (aid) => Buffer.concat([
        Buffer.from([0x90, 0x5A, 0x00, 0x00, aid.length]),
        aid,
        Buffer.from([0x00])
    ]),

    // Autenticação (AuthEV2First - Parte 1)
    AUTH_EV2_FIRST_PART1: (keyNo) => Buffer.from([
        0x90, 0x71, 0x00, 0x00, 0x02, keyNo, 0x00, 0x00
    ]),

    // ChangeKey
    CHANGE_KEY: (keyNo) => Buffer.from([
        0x90, 0xC4, 0x00, 0x00, 0x00 // Dados seguem
    ]),

    // SetConfiguration (Random ID + LRP)
    SET_CONFIG: () => Buffer.from([
        0x90, 0x5C, 0x00, 0x00, 0x02, 0x00, 0x03, 0x00 // Config byte = 0x03 (RID + LRP)
    ]),

    // ChangeFileSettings (File 02 - NDEF)
    CHANGE_FILE_SETTINGS: () => Buffer.from([
        0x90, 0x5F, 0x00, 0x00, 0x00 // Dados seguem
    ]),

    // WriteData (NDEF)
    WRITE_DATA: (fileNo) => Buffer.from([
        0x90, 0x8D, 0x00, 0x00, 0x00 // Dados seguem
    ])
};

// ========== FUNÇÕES AUXILIARES ==========
async function sendCommand(reader, command, description) {
    console.log(`📤 Enviando: ${description}`);
    console.log(`   APDU: ${command.toString('hex').toUpperCase()}`);

    return new Promise((resolve, reject) => {
        reader.transmit(command, 255, 2, (err, response) => {
            if (err) {
                console.error(`❌ Erro: ${err.message}`);
                return reject(err);
            }

            console.log(`📥 Resposta: ${response.toString('hex').toUpperCase()}`);

            // Verifica status word (últimos 2 bytes)
            const sw = response.slice(-2);
            if (sw.equals(Buffer.from([0x90, 0x00]))) {
                console.log(`✅ Sucesso\n`);
                resolve(response.slice(0, -2)); // Retorna dados sem SW
            } else if (sw.equals(Buffer.from([0x91, 0xAE]))) {
                console.log(`⚠️ Authentication required\n`);
                resolve(response.slice(0, -2));
            } else {
                console.error(`❌ Erro: Status Word = ${sw.toString('hex').toUpperCase()}\n`);
                reject(new Error(`Status Word error: ${sw.toString('hex')}`));
            }
        });
    });
}

function buildNDEFMessage(url) {
    // Cria um NDEF message com URL record
    // Formato simplificado (para tag vazia)
    const urlBytes = Buffer.from(url, 'utf8');

    // NDEF Record Header
    const tnf = 0x01; // Well-known type
    const typeLength = 0x01; // 'U' (URI)
    const payloadLength = urlBytes.length + 1; // URL + URI identifier

    const record = Buffer.concat([
        Buffer.from([0xD1]), // MB=1, ME=1, CF=0, SR=1, IL=0, TNF=001
        Buffer.from([typeLength]),
        Buffer.from([payloadLength]),
        Buffer.from([0x55]), // Type: 'U' (URI)
        Buffer.from([0x00]), // URI identifier: 0x00 (nenhum prefixo)
        urlBytes
    ]);

    // NDEF Message = TLV + Record
    const tlv = Buffer.concat([
        Buffer.from([0x03]), // TLV Type: NDEF Message
        Buffer.from([record.length]),
        record,
        Buffer.from([0xFE]) // TLV Terminator
    ]);

    return tlv;
}

// ========== FLUXO PRINCIPAL ==========
async function encodeTag() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  QUANTUM CERT - Script de Gravação NTAG 424 DNA       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('⚠️  ATENÇÃO: Este script irá ALTERAR as chaves da tag!');
    console.log('⚠️  Certifique-se que a tag está VAZIA ou de BACKUP.\n');

    console.log('📋 Configuração:');
    console.log(`   URL Base: ${CONFIG.baseUrl}`);
    console.log(`   SDM Offset: ${CONFIG.sdm.encOffset}`);
    console.log(`   SDM Length: ${CONFIG.sdm.encLength} bytes\n`);

    // Salvar chaves novas para referência
    console.log('🔑 Chaves geradas (SALVE ESTAS CHAVES!):');
    Object.entries(CONFIG.newKeys).forEach(([name, key]) => {
        console.log(`   ${name}: ${key.toString('hex').toUpperCase()}`);
    });
    console.log('');

    const nfc = new NFC();
    let encodingComplete = false;

    nfc.on('reader', async (reader) => {
        console.log(`✅ Leitor detectado: ${reader.name}\n`);
        console.log('⏳ Aguardando tag...\n');

        reader.on('card', async (card) => {
            if (encodingComplete) return;
            encodingComplete = true;

            console.log('🏷️  Tag detectada!');
            console.log(`   UID: ${card.uid}`);
            console.log(`   ATR: ${card.atr}\n`);

            try {
                // ========== PASSO 1: Selecionar Aplicação NTAG 424 DNA ==========
                console.log('═══ PASSO 1: Selecionando Aplicação NTAG 424 DNA ═══\n');
                const aid = Buffer.from([0xD2, 0x76, 0x00, 0x00, 0x85, 0x01, 0x01]); // AID padrão NTAG 424 DNA
                try {
                    await sendCommand(reader, APDU.SELECT_APP(aid), 'Select Application');
                } catch (err) {
                    console.log('⚠️  Aplicação já selecionada ou erro esperado. Continuando...\n');
                }

                // ========== PASSO 2: Autenticar com KEY_0 (padrão) ==========
                console.log('═══ PASSO 2: Autenticação com KEY_0 (Admin) ═══\n');
                console.log('⚠️  NOTA: Implementação completa de AuthEV2 requer challenge-response.');
                console.log('⚠️  Este script usa comandos simplificados para demonstração.\n');

                // ========== PASSO 3: Trocar Chaves ==========
                console.log('═══ PASSO 3: Trocando Chaves (SIMULADO) ═══\n');
                console.log('⚠️  ChangeKey requer autenticação prévia + CRC + Crypto.');
                console.log('⚠️  Em produção, usar biblioteca NXP TapLinx ou equivalente.\n');

                // ========== PASSO 4: Habilitar Random ID + LRP ==========
                console.log('═══ PASSO 4: Habilitando Random ID + LRP (SIMULADO) ═══\n');
                console.log('⚠️  SetConfiguration requer autenticação + secure messaging.\n');

                // ========== PASSO 5: Configurar SDM ==========
                console.log('═══ PASSO 5: Configurando SDM no File 02 (SIMULADO) ═══\n');
                console.log('⚠️  ChangeFileSettings requer autenticação + encrypted params.\n');

                // ========== PASSO 6: Gravar NDEF ==========
                console.log('═══ PASSO 6: Gravando URL NDEF (SIMULADO) ═══\n');
                const url = `${CONFIG.baseUrl}?d={SDMENC}&r={SDMReadCtr}&m={SDMMAC}`;
                const ndefMessage = buildNDEFMessage(url);
                console.log(`📝 NDEF Message (${ndefMessage.length} bytes):`);
                console.log(`   ${ndefMessage.toString('hex').toUpperCase()}\n`);
                console.log(`📝 URL: ${url}\n`);

                // ========== CONCLUSÃO ==========
                console.log('╔════════════════════════════════════════════════════════╗');
                console.log('║  ⚠️  SCRIPT DE DEMONSTRAÇÃO                           ║');
                console.log('╚════════════════════════════════════════════════════════╝\n');
                console.log('Este script demonstra a ESTRUTURA LÓGICA da gravação.');
                console.log('Para gravar REALMENTE uma NTAG 424 DNA, você precisa:\n');
                console.log('1. Implementar AuthEV2First/NonFirst completo (challenge-response)');
                console.log('2. Derivar chaves de sessão corretamente');
                console.log('3. Usar Secure Messaging para todos os comandos protegidos');
                console.log('4. Calcular CRC/CMAC corretamente para ChangeKey/ChangeFileSettings');
                console.log('5. OU usar biblioteca NXP TapLinx SDK ou libnfc com suporte NTAG 424 DNA\n');

                console.log('✅ Demonstração concluída. Tag NÃO foi modificada.\n');

            } catch (err) {
                console.error('❌ Erro durante gravação:', err.message);
            }

            process.exit(0);
        });

        reader.on('error', err => {
            console.error('❌ Erro no leitor:', err.message);
        });
    });

    nfc.on('error', err => {
        console.error('❌ Erro NFC:', err.message);
        process.exit(1);
    });
}

// Executar
encodeTag().catch(console.error);
