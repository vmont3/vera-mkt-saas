// @ts-ignore
const { AesCmac } = require('aes-cmac');
console.log("AesCmac prototype:", Object.getOwnPropertyNames(AesCmac.prototype));
try {
    const instance = new AesCmac(Buffer.alloc(16));
    console.log("Instance methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(instance)));
} catch (e: any) {
    console.log("Error instantiating:", e.message);
}



