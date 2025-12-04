import { NfcHardwareDriver } from '../src/modules/tag-encoding/driver/NfcHardwareDriver';
import { Ntag424Encoder } from '../src/modules/tag-encoding/encoder/Ntag424Encoder';
import { TagEncodingJob } from '../src/modules/tag-encoding/domain/TagEncodingTypes';

// Mock Driver
class MockNfcDriver implements NfcHardwareDriver {
    private connected = false;

    async connect(): Promise<void> {
        console.log("[MockDriver] Connecting...");
        this.connected = true;
    }

    async waitForTag(timeoutMs?: number): Promise<string> {
        if (!this.connected) throw new Error("Not connected");
        console.log("[MockDriver] Waiting for tag...");
        await new Promise(r => setTimeout(r, 500)); // Simulate delay
        console.log("[MockDriver] Tag detected: 04:A1:B2:C3:D4:E5:F6");
        return "04:A1:B2:C3:D4:E5:F6";
    }

    async getUid(): Promise<string> {
        return "04:A1:B2:C3:D4:E5:F6";
    }

    async transmit(apdu: Buffer): Promise<Buffer> {
        const cmd = apdu.toString('hex').toUpperCase();
        console.log(`[MockDriver] >> APDU: ${cmd}`);

        // Simulate responses based on command
        let response = Buffer.from("9000", "hex"); // Default success

        // GetVersion (0x60)
        if (cmd.includes("60")) {
            // NTAG 424 DNA version bytes (simplified)
            response = Buffer.from("0004040201001103" + "9000", "hex");
        }
        // AuthEV2First (0x71)
        else if (cmd.includes("71")) {
            // AF + 16 bytes challenge
            response = Buffer.from("AF" + "00000000000000000000000000000000" + "9000", "hex");
        }
        // AuthEV2NonFirst (0xAF)
        else if (cmd.includes("AF")) {
            // 00 + 16 bytes + TI
            response = Buffer.from("00" + "00000000000000000000000000000000" + "00000000" + "9000", "hex");
        }
        // ReadSig (0x3C)
        else if (cmd.includes("3C")) {
            // Signature bytes
            response = Buffer.from("00".repeat(32) + "9000", "hex");
        }

        console.log(`[MockDriver] << Resp: ${response.toString('hex').toUpperCase()}`);
        return response;
    }

    async disconnect(): Promise<void> {
        console.log("[MockDriver] Disconnected");
        this.connected = false;
    }
}

// Mock KMS
const mockKms = {
    getAppKey: async () => Buffer.alloc(16),
    getSdmKey: async () => Buffer.alloc(16),
    getNdefKey: async () => Buffer.alloc(16),
    getProtKey: async () => Buffer.alloc(16),
    getAuthHostKey: async () => Buffer.alloc(16),
    encrypt: async () => Buffer.alloc(16),
    decrypt: async () => Buffer.alloc(16),
    generateMac: async () => Buffer.alloc(8)
};

async function main() {
    console.log("🚀 Starting Simulated NTAG 424 DNA Encoding Test");

    const driver = new MockNfcDriver();
    const encoder = new Ntag424Encoder(driver, mockKms as any, {
        ccSize: 32,
        ndefSize: 256,
        protectedSize: 128
    });

    const job: TagEncodingJob = {
        id: 'sim-job-001',
        assetId: 'asset-sim-1',
        tagInternalId: 'tag-sim-1',
        assetType: 'PRODUTO',
        falconMasterId: 'falcon-sim',
        truncatedHash: 'hash-sim',
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

    try {
        await driver.connect();
        await encoder.encode(job);
        console.log("✅ Simulation Completed Successfully");
    } catch (error) {
        console.error("❌ Simulation Failed:", error);
    } finally {
        await driver.disconnect();
    }
}

main().catch(console.error);
