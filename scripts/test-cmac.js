try {
    const { AesCmac } = require('aes-cmac');
    console.log('AesCmac type:', typeof AesCmac);
    if (typeof AesCmac === 'function') {
        console.log('AesCmac prototype:', AesCmac.prototype);
        try {
            const key = Buffer.alloc(16);
            const message = Buffer.from('test');
            const instance = new AesCmac(key);
            console.log('Instance created');
            const mac = instance.calculate(message);
            console.log('MAC calculated:', mac);
        } catch (e) {
            console.log('Usage error:', e.message);
        }
    }
} catch (e) {
    console.error('Error:', e.message);
}
