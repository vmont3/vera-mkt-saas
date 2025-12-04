declare module 'aes-cmac' {
    export function aesCmac(key: Buffer | string, message: Buffer | string, options?: any): Buffer;
}
