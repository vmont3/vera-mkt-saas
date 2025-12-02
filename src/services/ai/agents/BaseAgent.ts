import { GeminiService } from '../GeminiService';

export abstract class BaseAgent {
    protected ai: GeminiService;
    protected name: string;
    protected role: string;

    constructor(name: string, role: string) {
        this.ai = new GeminiService();
        this.name = name;
        this.role = role;
    }

    abstract execute(task: any): Promise<any>;

    protected log(message: string) {
        console.log(`[AGENT: ${this.name}] ${message}`);
    }
}
