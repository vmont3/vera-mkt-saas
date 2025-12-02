import express from 'express';
import dotenv from 'dotenv';
import { VeraController } from './services/ai/api/VeraController';
import { apiLogger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health Check
app.get('/health', (req, res) => res.json({ status: 'OK', service: 'Vera Platform (SaaS)' }));

// API Routes
app.post('/api/v1/vera/campaign', VeraController.createCampaign);
app.post('/api/v1/vera/interact', VeraController.interact);

// Start Server
app.listen(PORT, () => {
    apiLogger.info(`[VERA-PLATFORM] 🚀 Server running on port ${PORT}`);
});
