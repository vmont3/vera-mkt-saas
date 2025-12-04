import { UfrNfcHardwareDriver } from '../src/modules/tag-encoding/driver/UfrNfcHardwareDriver';

async function testUfrDriver() {
    console.log('🔌 Iniciando teste do driver µFR NTAG 424 DNA...');

    const driver = new UfrNfcHardwareDriver();

    try {
        console.log('1. Inicializando driver...');
        await driver.initialize();
        console.log('✅ Driver inicializado.');

        console.log('\n⏳ Aguardando tag NTAG 424 DNA...');
        const uid = await driver.waitForTag();
        console.log(`✅ Tag detectada! UID: ${uid.toString('hex').toUpperCase()}`);

        console.log('\n2. Testando GetVersion (APDU 0x60)...');
        // GetVersion returns 28 bytes: Vendor(1) + Type(1) + Subtype(1) + Major(1) + Minor(1) + Storage(1) + Protocol(1)
        // We need to access the internal transceive method or add a public getVersion method to the driver.
        // Since getVersion is not public in the interface, we'll skip direct APDU test here 
        // or we can try to authenticate with default key if we want to test more.

        console.log('⚠️  Para testes mais avançados (Auth/Read/Write), use o script de encoding completo.');
        console.log('   Este script apenas verifica a detecção da tag e comunicação básica.');

    } catch (error: any) {
        console.error('\n❌ Erro durante o teste:', error.message);
        if (error.message.includes('uFCoder library not found')) {
            console.log('\nDICA: Certifique-se que a biblioteca uFCoder (dll/so/dylib) está no PATH ou no diretório do projeto.');
        }
    } finally {
        try {
            await driver.close();
            console.log('\n🔌 Driver fechado.');
        } catch (e) {
            // ignore
        }
    }
}

testUfrDriver().catch(console.error);
