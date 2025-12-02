import { Acr122uNfcHardwareDriver } from '../src/modules/tag-encoding/driver/Acr122uNfcHardwareDriver';

async function testReader() {
    console.log('🔌 Iniciando teste de conexão com o leitor ACR122U...');
    console.log('Certifique-se que o leitor está conectado na USB.');

    const driver = new Acr122uNfcHardwareDriver();

    try {
        await driver.connect();
        console.log('✅ SUCESSO: Leitor detectado e conectado!');

        console.log('⏳ Aguardando tag... (Aproxime uma tag para testar)');

        const uid = await driver.waitForTag(10000);
        if (uid) {
            console.log(`🏷️ Tag detectada! UID: ${uid}`);
        } else {
            console.log('❌ Nenhuma tag detectada nos últimos 10 segundos.');
        }

        await driver.disconnect();
    } catch (error: any) {
        console.error('❌ ERRO: Não foi possível conectar ao leitor.');
        console.error('Detalhes:', error.message);
        console.log('\nDICAS:');
        console.log('1. Verifique se o driver do ACR122U está instalado no Windows.');
        console.log('2. Verifique se o serviço "Cartão Inteligente" (Smart Card) do Windows está rodando.');
        console.log('3. Tente desconectar e reconectar o USB.');
    }
}

testReader();
