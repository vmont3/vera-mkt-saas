<<<<<<< HEAD
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
=======
import app from './app';
import dotenv from 'dotenv';
import { VeraChatService } from './services/ai/VeraChatService';

dotenv.config();

const PORT = process.env.PORT || 3000;

// Initialize Services
const veraChatService = new VeraChatService();

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});

// Error 21: Global Request Timeout
server.setTimeout(30000); // 30 seconds global timeout
>>>>>>> 81b8531956a11ad0df3c8a481f0fae242197d980
