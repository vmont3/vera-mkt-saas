import { Acr122uNfcHardwareDriver } from '../src/modules/tag-encoding/driver/Acr122uNfcHardwareDriver';

async function main() {
    console.log("Initializing ACR122U Driver...");
    const driver = new Acr122uNfcHardwareDriver();

    try {
        await driver.connect();
        console.log("Driver connected. Waiting for tag...");

        const uid = await driver.waitForTag(10000);
        console.log(`Tag detected! UID: ${uid}`);

        // Send Get Version (Native wrapped in ISO)
        // 90 60 00 00 00
        const apdu = Buffer.from([0x90, 0x60, 0x00, 0x00, 0x00]);
        console.log(`Sending APDU: ${apdu.toString('hex')}`);

        const response = await driver.transmit(apdu);
        console.log(`Response: ${response.toString('hex')}`);

        // Check SW
        const sw = response.slice(response.length - 2);
        if (sw[0] === 0x91 && sw[1] === 0x00) {
            console.log("Success (91 00)");
        } else {
            console.log(`SW: ${sw.toString('hex')}`);
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await driver.disconnect();
        console.log("Driver disconnected.");
    }
}

main().catch(console.error);
