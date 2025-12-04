import { IntelligentPartnerHub, TaskRequest } from '../partners/IntelligentPartnerHub';

export interface Experiment {
    id: string;
    name: string;
    variants: {
        id: string;
        promptTemplate: string;
        modelId: string;
    }[];
    metrics: {
        variantId: string;
        latency: number[];
        userRating: number[];
    }[];
    status: 'running' | 'completed';
}

export class QuantumLab {
    private static instance: QuantumLab;
    private experiments: Map<string, Experiment> = new Map();
    private hub: IntelligentPartnerHub;

    private constructor() {
        this.hub = IntelligentPartnerHub.getInstance();
    }

    public static getInstance(): QuantumLab {
        if (!QuantumLab.instance) {
            QuantumLab.instance = new QuantumLab();
        }
        return QuantumLab.instance;
    }

    public createExperiment(name: string, variants: Experiment['variants']): Experiment {
        const experiment: Experiment = {
            id: `exp-${Date.now()}`,
            name,
            variants,
            metrics: variants.map(v => ({ variantId: v.id, latency: [], userRating: [] })),
            status: 'running'
        };
        this.experiments.set(experiment.id, experiment);
        console.log(`[QuantumLab] Started experiment: ${name}`);
        return experiment;
    }

    public async runTrial(experimentId: string, input: string): Promise<{ variantId: string, output: string }> {
        const exp = this.experiments.get(experimentId);
        if (!exp || exp.status !== 'running') throw new Error('Experiment not found or inactive');

        // Randomly assign variant (A/B split)
        const variant = exp.variants[Math.floor(Math.random() * exp.variants.length)];

        const start = Date.now();
        const prompt = variant.promptTemplate.replace('{{input}}', input);

        // Execute
        const task: TaskRequest = {
            taskId: `trial-${Date.now()}`,
            type: 'text_generation',
            priority: 'medium',
            constraints: {}
        };

        // In real scenario, we'd force the specific model from variant
        const output = await this.hub.executeTask(task, prompt);
        const duration = Date.now() - start;

        // Record metric
        this.recordMetric(exp.id, variant.id, 'latency', duration);

        return { variantId: variant.id, output };
    }

    public recordMetric(experimentId: string, variantId: string, metric: 'latency' | 'userRating', value: number) {
        const exp = this.experiments.get(experimentId);
        if (!exp) return;

        const variantMetrics = exp.metrics.find(m => m.variantId === variantId);
        if (variantMetrics) {
            variantMetrics[metric].push(value);
        }
    }

    public getResults(experimentId: string): any {
        const exp = this.experiments.get(experimentId);
        if (!exp) return null;

        return exp.metrics.map(m => ({
            variantId: m.variantId,
            avgLatency: m.latency.reduce((a, b) => a + b, 0) / (m.latency.length || 1),
            avgRating: m.userRating.reduce((a, b) => a + b, 0) / (m.userRating.length || 1),
            sampleSize: m.latency.length
        }));
    }
}
