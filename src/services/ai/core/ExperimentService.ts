import { apiLogger } from '../../../utils/logger';

export interface ExperimentConfig {
    id: string;
    name: string;
    hypothesis: string;
    control: any; // The original strategy/config
    variant: any; // The new strategy/config
    startDate: Date;
    status: 'RUNNING' | 'CONCLUDED';
    metrics: {
        controlSamples: number;
        controlScoreSum: number;
        variantSamples: number;
        variantScoreSum: number;
    };
    winner?: 'CONTROL' | 'VARIANT';
}

export class ExperimentService {
    private experiments: Map<string, ExperimentConfig> = new Map();

    constructor() {
        // Load active experiments from persistence (Mocked for MVP)
    }

    /**
     * Start a new A/B Test
     */
    startExperiment(name: string, hypothesis: string, control: any, variant: any): ExperimentConfig {
        const id = `exp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const experiment: ExperimentConfig = {
            id,
            name,
            hypothesis,
            control,
            variant,
            startDate: new Date(),
            status: 'RUNNING',
            metrics: {
                controlSamples: 0,
                controlScoreSum: 0,
                variantSamples: 0,
                variantScoreSum: 0
            }
        };

        this.experiments.set(id, experiment);
        apiLogger.info(`[EXPERIMENT] Started: ${name} (${id})`);
        return experiment;
    }

    /**
     * Get the config to use for a specific request (Randomized assignment)
     */
    getAssignment(experimentId: string): { group: 'CONTROL' | 'VARIANT', config: any } {
        const exp = this.experiments.get(experimentId);
        if (!exp || exp.status !== 'RUNNING') {
            throw new Error(`Experiment ${experimentId} not active`);
        }

        // Simple 50/50 split
        const isControl = Math.random() > 0.5;
        return {
            group: isControl ? 'CONTROL' : 'VARIANT',
            config: isControl ? exp.control : exp.variant
        };
    }

    /**
     * Track the result of an interaction
     */
    trackResult(experimentId: string, group: 'CONTROL' | 'VARIANT', score: number) {
        const exp = this.experiments.get(experimentId);
        if (!exp || exp.status !== 'RUNNING') return;

        if (group === 'CONTROL') {
            exp.metrics.controlSamples++;
            exp.metrics.controlScoreSum += score;
        } else {
            exp.metrics.variantSamples++;
            exp.metrics.variantScoreSum += score;
        }

        this.experiments.set(experimentId, exp);
        // In real app: Persist update
    }

    /**
     * Conclude experiment and declare winner
     */
    concludeExperiment(experimentId: string): ExperimentConfig {
        const exp = this.experiments.get(experimentId);
        if (!exp) throw new Error('Experiment not found');

        const controlAvg = exp.metrics.controlSamples > 0 ? exp.metrics.controlScoreSum / exp.metrics.controlSamples : 0;
        const variantAvg = exp.metrics.variantSamples > 0 ? exp.metrics.variantScoreSum / exp.metrics.variantSamples : 0;

        exp.status = 'CONCLUDED';

        // Simple winner determination logic
        // In real app: Use statistical significance (t-test / chi-square)
        if (variantAvg > controlAvg * 1.05) { // 5% improvement threshold
            exp.winner = 'VARIANT';
            apiLogger.info(`[EXPERIMENT] ${exp.name} Concluded. WINNER: VARIANT (Avg: ${variantAvg.toFixed(2)} vs ${controlAvg.toFixed(2)})`);
        } else {
            exp.winner = 'CONTROL';
            apiLogger.info(`[EXPERIMENT] ${exp.name} Concluded. WINNER: CONTROL (Avg: ${controlAvg.toFixed(2)} vs ${variantAvg.toFixed(2)})`);
        }

        return exp;
    }

    getActiveExperiments(): ExperimentConfig[] {
        return Array.from(this.experiments.values()).filter(e => e.status === 'RUNNING');
    }
}
