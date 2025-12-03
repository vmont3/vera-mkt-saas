export class SecretManagerService {
    static async getSecret(name: string): Promise<string> {
        return process.env[name] || '';
    }
}
