const { NFC } = require('nfc-pcsc');

async function testReader() {
    console.log('🔌 Iniciando teste de conexão com o leitor ACR122U...');
    console.log('Certifique-se que o leitor está conectado na USB.\n');

    const nfc = new NFC();
    let readerDetected = false;
    let tagDetected = false;

    nfc.on('reader', reader => {
        readerDetected = true;
        console.log('✅ SUCESSO: Leitor detectado!');
        console.log(`📱 Nome: ${reader.name}\n`);
        console.log('⏳ Aguardando tag... (Aproxime uma tag NFC para testar)\n');

        reader.on('card', card => {
            tagDetected = true;
            console.log(`🏷️ Tag detectada!`);
            console.log(`   UID: ${card.uid}`);
            console.log(`   Tipo: ${card.type || 'Desconhecido'}`);
            console.log(`   ATR: ${card.atr}\n`);
        });

        reader.on('card.off', () => {
            console.log('❌ Tag removida.\n');
        });

        reader.on('error', err => {
            console.error('❌ Erro no leitor:', err.message);
        });
    });

    nfc.on('error', err => {
        console.error('❌ ERRO: Não foi possível conectar ao leitor.');
        console.error('Detalhes:', err.message);
        console.log('\n📋 DICAS:');
        console.log('1. Verifique se o driver do ACR122U está instalado no Windows.');
        console.log('2. Verifique se o serviço "Cartão Inteligente" (Smart Card) do Windows está rodando.');
        console.log('3. Tente desconectar e reconectar o USB.');
        console.log('4. Execute: services.msc → procure "Smart Card" → inicie o serviço se estiver parado.\n');
        process.exit(1);
    });

    // Keep alive for 30 seconds
    setTimeout(() => {
        if (!readerDetected) {
            console.log('⏱️ Tempo esgotado. Nenhum leitor foi detectado.\n');
        } else if (!tagDetected) {
            console.log('⏱️ Leitor OK, mas nenhuma tag foi aproximada.\n');
        }
        console.log('✨ Teste concluído.');
        process.exit(0);
    }, 30000);
}

testReader().catch(console.error);
