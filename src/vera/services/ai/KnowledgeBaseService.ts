import * as fs from 'fs';
import * as path from 'path';

interface QAPair {
    question: string;
    answer: string;
    tags: string[];
    addedAt: Date;
}

export class KnowledgeBaseService {
    private kbPath: string;
    private data: QAPair[] = [];

    constructor() {
        this.kbPath = path.join(__dirname, '../../../../data/knowledge_base.json');
        this.load();
    }

    private load() {
        try {
            if (fs.existsSync(this.kbPath)) {
                const raw = fs.readFileSync(this.kbPath, 'utf-8');
                this.data = JSON.parse(raw);
            } else {
                // Seed with some initial data
                this.data = [
                    {
                        question: 'O que é a Quantum Cert?',
                        answer: 'A Quantum Cert é uma plataforma de autenticação de ativos usando tecnologia NFC e Blockchain.',
                        tags: ['sobre', 'institucional'],
                        addedAt: new Date()
                    }
                ];
                this.save();
            }
        } catch (error) {
            console.error('[KB] Failed to load knowledge base:', error);
            this.data = [];
        }
    }

    private save() {
        try {
            const dir = path.dirname(this.kbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.kbPath, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('[KB] Failed to save knowledge base:', error);
        }
    }

    /**
     * Add a new Q&A pair (Learning)
     */
    addEntry(question: string, answer: string, tags: string[] = []) {
        this.data.push({
            question,
            answer,
            tags,
            addedAt: new Date()
        });
        this.save();
        console.log(`[KB] Learned: "${question}" -> "${answer}"`);
    }

    /**
     * Search for an answer
     * In a real system, this would use Vector Search (Embeddings).
     * For MVP, we use simple keyword matching or return all for LLM filtering.
     */
    search(query: string): string | null {
        const lowerQuery = query.toLowerCase();

        // Simple exact/partial match for MVP
        const match = this.data.find(entry =>
            lowerQuery.includes(entry.question.toLowerCase()) ||
            entry.question.toLowerCase().includes(lowerQuery)
        );

        return match ? match.answer : null;
    }

    /**
     * Get entire KB context for the AI
     */
    getContext(): string {
        return this.data.map(e => `Q: ${e.question}\nA: ${e.answer}`).join('\n\n');
    }
}
