import { Acr122uNfcHardwareDriver } from '../src/modules/tag-encoding/driver/Acr122uNfcHardwareDriver';

async function main() {
    console.log("Initializing ACR122U Driver...");
    const driver = new Acr122uNfcHardwareDriver();

    try {
        await driver.connect();
        console.log("Driver connected. Waiting for tag...");

        const uid = await driver.waitForTag(10000);
        console.log(`Tag detected! UID: ${uid}`);

        const uidCheck = await driver.getUid();
        console.log(`UID check: ${uidCheck}`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await driver.disconnect();
        console.log("Driver disconnected.");
    }
}

main().catch(console.error);
