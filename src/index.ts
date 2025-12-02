import app from './app';
import dotenv from 'dotenv';
import { VeraChatService } from './services/ai/VeraChatService';

dotenv.config();

const PORT = process.env.PORT || 3000;

// Initialize Services
const veraChatService = new VeraChatService();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});
