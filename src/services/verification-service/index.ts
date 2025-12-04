import { Router, Request, Response } from 'express';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'verification-service' });
});

// Public Demo Endpoint - Hello World
router.get('/test/:id', (req: Request, res: Response) => {
    const { id } = req.params;

    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Quantum Cert | Verificado</title>
        <style>
            :root {
                --bg-color: #0a0a0a;
                --card-bg: #1a1a1a;
                --text-primary: #ffffff;
                --text-secondary: #a0a0a0;
                --accent: #00ff88;
                --accent-glow: rgba(0, 255, 136, 0.2);
            }
            body {
                margin: 0;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                background-color: var(--bg-color);
                color: var(--text-primary);
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 20px;
            }
            .container {
                width: 100%;
                max-width: 400px;
                text-align: center;
            }
            .logo {
                font-size: 1.5rem;
                font-weight: 700;
                letter-spacing: -0.05em;
                margin-bottom: 2rem;
                background: linear-gradient(to right, #fff, #a0a0a0);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .card {
                background: var(--card-bg);
                padding: 2.5rem;
                border-radius: 24px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(10px);
                animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .icon-wrapper {
                width: 80px;
                height: 80px;
                background: var(--accent-glow);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1.5rem;
                position: relative;
            }
            .icon-wrapper::after {
                content: '';
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                border: 2px solid var(--accent);
                animation: pulse 2s infinite;
            }
            .icon {
                font-size: 2.5rem;
                color: var(--accent);
            }
            h1 {
                font-size: 1.5rem;
                margin: 0 0 0.5rem;
                font-weight: 600;
            }
            .status {
                color: var(--accent);
                font-weight: 500;
                font-size: 0.9rem;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                margin-bottom: 1.5rem;
                display: block;
            }
            .message {
                color: var(--text-secondary);
                font-size: 1rem;
                line-height: 1.5;
                margin-bottom: 2rem;
            }
            .details {
                background: rgba(255, 255, 255, 0.03);
                border-radius: 12px;
                padding: 1rem;
                text-align: left;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 0.5rem;
                font-size: 0.9rem;
            }
            .detail-row:last-child {
                margin-bottom: 0;
            }
            .label {
                color: var(--text-secondary);
            }
            .value {
                font-family: 'Monaco', monospace;
                color: var(--text-primary);
            }
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(1.5); opacity: 0; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">QUANTUM CERT</div>
            <div class="card">
                <div class="icon-wrapper">
                    <div class="icon">✓</div>
                </div>
                <span class="status">Autenticidade Confirmada</span>
                <h1>Produto Verificado</h1>
                <p class="message">Este item foi verificado com sucesso na blockchain Quantum Cert.</p>
                
                <div class="details">
                    <div class="detail-row">
                        <span class="label">ID do Item</span>
                        <span class="value">${id}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Verificado em</span>
                        <span class="value">${new Date().toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    return res.send(html);
});

export default router;
