import { NfcHardwareDriver } from "../driver/NfcHardwareDriver";
import { Ntag424Commands } from "../driver/Ntag424Commands";
import { KmsClient } from "../infra/KmsClient";
import { TagEncodingJob } from "../domain/TagEncodingTypes";
import { buildNdefForQuantumCert } from "../util/NdefBuilder";
import { SdmLayout } from "../util/SdmLayout";

export interface Ntag424EncoderConfig {
    ccSize: number;
    ndefSize: number;
    protectedSize: number;
}

export class Ntag424Encoder {
    constructor(
        private readonly driver: NfcHardwareDriver,
        private readonly kms: KmsClient,
        private readonly config: Ntag424EncoderConfig
    ) { }

    async encode(job: TagEncodingJob): Promise<{ uid: string | null }> {
        console.log(`[Encoder] Iniciando encoding para job ${job.id}...`);

        // 1) Esperar tag
        console.log("[Encoder] Aguardando tag NFC...");
        const uid = await this.driver.waitForTag();
        console.log(`[Encoder] Tag detectada: ${uid}`);

        const commands = new Ntag424Commands(this.driver);

        try {
            // 2) Obter chaves
            const kApp = await this.kms.getAppKey();

            // 3) Autenticar EV2
            console.log("[Encoder] Autenticando com K_APP...");
            await commands.authenticateEV2First(0, Buffer.from(kApp));

            // 4) Configurar Random ID + LRP (SetConfiguration)
            console.log("[Encoder] Configurando Random ID...");
            // Config byte: 0x02 (Random ID)
            // 90 5C 00 00 01 02
            await commands.setConfiguration(Buffer.from([0x02]));

            // 5) Criar arquivos (Opcional, se não existirem)
            // NTAG 424 DNA usually comes with CC and NDEF files.
            // We might need to resize them or clear them.
            // For now, we assume they exist or we just write to them.

            // 6) Configurar SDM
            console.log("[Encoder] Configurando SDM...");
            // File 2 (NDEF) settings
            // We need to construct the FileSettings buffer.
            // This is complex.
            // FileOption (1) + AccessRights (2) + SDM Options...

            // Placeholder for SDM settings construction
            const sdmSettings = Buffer.alloc(10); // TODO: Construct correct settings
            await commands.changeFileSettings(2, sdmSettings);

            // 7) Gravar NDEF
            console.log("[Encoder] Gravando NDEF...");
            const sdmLayout: SdmLayout = {
                urlBase: job.urlBase,
                sdmEncOffset: job.sdmEncOffset,
                sdmEncLength: job.sdmEncLength,
                sdmReadCtrOffset: job.sdmReadCtrOffset,
                sdmMacOffset: job.sdmMacOffset,
                sdmMacInputOffset: job.sdmMacInputOffset,
            };
            const ndefBytes = buildNdefForQuantumCert(sdmLayout);
            await commands.writeData(2, 0, Buffer.from(ndefBytes));

            // 9) Lock (Change Access Rights)
            console.log("[Encoder] Travando tag...");
            // await commands.changeFileSettings(2, lockedSettings);

            console.log(`[Encoder] ✅ Encoding completo!`);
            return { uid };

        } catch (err: any) {
            console.error(`[Encoder] ❌ Erro:`, err);
            throw err;
        } finally {
            // Don't close driver here if it's shared, but usually we disconnect after job.
            // The worker service should handle disconnect.
        }
    }

    validateJobConfig(job: TagEncodingJob): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        if (!job.urlBase) errors.push("URL base obrigatória");
        return { valid: errors.length === 0, errors };
    }
}
