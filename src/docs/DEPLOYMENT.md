# Quantum Cert Backend - Deployment Guide

## Prerequisites
- **Node.js**: v18+
- **PostgreSQL**: v14+
- **Smart Card Drivers**:
    - **Windows**: Standard PC/SC drivers (usually auto-installed).
    - **Linux**: `pcscd`, `libpcsclite1`, `pcsc-tools`.
    - **macOS**: Native support (check `pcsctest`).
- **Hardware**: ACR122U NFC Reader (for Encoding Worker).

## Installation

1. **Clone Repository**
   ```bash
   git clone <repo-url>
   cd qc-backend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Copy `.env.example` to `.env` and configure:
   ```env
   DATABASE_URL="postgresql://user:pass@localhost:5432/quantum_cert"
   KMS_MASTER_KEY_ID="alias/qc-master-key"
   ALGORAND_TOKEN=""
   ALGORAND_SERVER="https://testnet-api.algonode.cloud"
   ALGORAND_PORT=""
   ALGORAND_QC_ACCOUNT_MNEMONIC="your 25 word [REDACTED]..."
   FALCON_PRIVATE_KEY_SECRET_ID="falcon_priv_v1"
   ```

4. **Database Setup**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

## Running the System

The system consists of two main components that can run separately or together:

### 1. API Server (Registry, Verification, Public API)
```bash
npm start
# OR
npx ts-node src/app.ts
```
*Runs on port 3000 by default.*

### 2. Encoding Worker (Requires Physical Reader)
This process MUST run on a machine with the ACR122U reader connected via USB.
```bash
npm run worker
# OR
npx ts-node scripts/run-encoding-worker.ts
```

### 3. Retry Worker (Background Jobs)
Handles Algorand anchoring retries and Webhook deliveries.
*Can be run alongside API or as a separate process.*
```bash
npx ts-node scripts/run-retry-worker.ts
```

## Docker Deployment (API Only)
*Note: The Encoding Worker requires USB access and is best run on bare metal or a privileged container with USB passthrough.*

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
CMD ["npm", "start"]
```
