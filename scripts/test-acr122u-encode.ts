import { Acr122uNfcHardwareDriver } from '../src/modules/tag-encoding/driver/Acr122uNfcHardwareDriver';
import { Ntag424Encoder } from '../src/modules/tag-encoding/encoder/Ntag424Encoder';
import { TagEncodingJob } from '../src/modules/tag-encoding/domain/TagEncodingTypes';

// Mock KMS
const mockKms = {
    getAppKey: async () => Buffer.alloc(16), // Zero key
    getSdmKey: async () => Buffer.alloc(16),
    getNdefKey: async () => Buffer.alloc(16),
    getProtKey: async () => Buffer.alloc(16),
    getAuthHostKey: async () => Buffer.alloc(16),
    encrypt: async () => Buffer.alloc(16),
    decrypt: async () => Buffer.alloc(16),
    generateMac: async () => Buffer.alloc(8)
};

async function main() {
    console.log("Initializing ACR122U Driver...");
    const driver = new Acr122uNfcHardwareDriver();

    try {
        await driver.connect();

        const encoder = new Ntag424Encoder(driver, mockKms as any, {
            ccSize: 32,
            ndefSize: 256,
            protectedSize: 128
        });

        const job: TagEncodingJob = {
            id: 'test-job-1',
            assetId: 'test-asset',
            tagInternalId: 'test-tag',
            assetType: 'PRODUTO',
            falconMasterId: 'falcon-1',
            truncatedHash: 'hash123',
            urlBase: 'https://qc.io/v',
            sdmEncOffset: 32,
            sdmEncLength: 64,
            sdmReadCtrOffset: 0,
            sdmMacOffset: 0,
            sdmMacInputOffset: 0,
            status: 'PENDENTE',
            attempts: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        console.log("Starting encoding simulation...");
        const result = await encoder.encode(job);
        console.log("Encoding result:", result);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await driver.disconnect();
        console.log("Driver disconnected.");
    }
}

main().catch(console.error);
