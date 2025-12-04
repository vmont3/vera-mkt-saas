
import dotenv from 'dotenv';
import { VeraChatService } from '../src/vera/services/ai/VeraChatService';
import { SocialMediaService } from '../src/vera/services/social/SocialMediaService';

dotenv.config();

async function testIntegrity() {
    console.log('Testing VeraChatService instantiation...');
    try {
        // Mock process.env for the test
        process.env.TELEGRAM_BOT_TOKEN = 'mock_token';
        const vera = new VeraChatService();
        console.log('✅ VeraChatService instantiated successfully.');
    } catch (error) {
        console.error('❌ VeraChatService failed to instantiate:', error);
        process.exit(1);
    }

    console.log('Testing SocialMediaService instantiation...');
    try {
        const social = new SocialMediaService();
        console.log('✅ SocialMediaService instantiated successfully.');
    } catch (error) {
        console.error('❌ SocialMediaService failed to instantiate:', error);
        process.exit(1);
    }

    console.log('All integrity tests passed.');
}

testIntegrity();
