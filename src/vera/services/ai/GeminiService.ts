import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        const apiKey = process.env.GOOGLE_API_KEY || 'mock_key';
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    }

    /**
     * Generate Social Media Content
     */
    async generateContent(topic: string, context: string, style: 'PROFESSIONAL' | 'CASUAL' | 'WITTY' = 'PROFESSIONAL'): Promise<string> {
        if (process.env.GOOGLE_API_KEY === 'mock_key') {
            return `[MOCK GEMINI] Generating ${style} post about ${topic} with context: ${context}`;
        }

        try {
            const prompt = `
                You are Vera, the AI Social Media Manager for Quantum Cert.
                Your tone is: ${style}.
                
                Topic: ${topic}
                Context: ${context}
                
                Task: Write a short, engaging social media post (Instagram/LinkedIn style). 
                Include emojis and hashtags.
            `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Gemini Generation Error:', error);
            return 'Error generating content. Please check API Key.';
        }
    }

    /**
     * Analyze Sentiment of a Comment/DM
     */
    async analyzeSentiment(text: string): Promise<'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'> {
        if (process.env.GOOGLE_API_KEY === 'mock_key') return 'NEUTRAL';

        try {
            const prompt = `
                Analyze the sentiment of this text: "${text}"
                Return ONLY one word: POSITIVE, NEGATIVE, or NEUTRAL.
            `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const sentiment = response.text().trim().toUpperCase();

            if (['POSITIVE', 'NEGATIVE', 'NEUTRAL'].includes(sentiment)) {
                return sentiment as 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
            }
            return 'NEUTRAL';
        } catch (error) {
            console.error('Gemini Sentiment Error:', error);
            return 'NEUTRAL';
        }
    }
}
