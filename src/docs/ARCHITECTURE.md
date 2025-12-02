# Quantum Cert Backend - System Architecture

## Overview
Quantum Cert is a high-security backend for managing physical asset certification using NTAG 424 DNA tags, Falcon-512 post-quantum cryptography, and Algorand blockchain anchoring.

## Core Modules

### 1. Tag Encoding (Hardware Layer)
- **Driver**: `Acr122uNfcHardwareDriver` (PC/SC via `nfc-pcsc`)
- **Encoder**: `Ntag424Encoder`
- **Crypto**: `Ntag424Crypto` (AES-128, CMAC, EV2 Auth)
- **Worker**: `TagEncodingWorkerService` (Polls `EncoderQueue`, processes jobs)

**Flow**:
1. `EncoderQueue` receives a job (via API).
2. Worker picks up job (`PENDING`).
3. Worker connects to ACR122U reader.
4. Worker authenticates tag (EV2), sets keys, writes NDEF (SDM URL).
5. Job marked `COMPLETED`, Tag marked `ACTIVE`.

### 2. Registry & Verification (Business Logic)
- **Registry**: `TagRegistryService` (Links Assets <-> Tags)
- **Verification**: `VerificationService`
    - Parses SDM URL (`d`, `r`, `m`, `tid`).
    - Decrypts `d` (SDMENC) using `tid` for O(1) lookup.
    - Verifies `m` (SDMMAC).
    - Checks Anti-Replay (`sdmReadCtr`).
    - Validates `hashTruncated` (Falcon-512 derivative).

### 3. Cryptography (Security Layer)
- **Post-Quantum**: `QuantumCryptoService` (Falcon-512 signatures).
- **Key Management**: `AWSKMSService` (Mocked/Real integration for Master Keys).
- **SDM Keys**: Derived per tag using KDF (Key Derivation Function).

### 4. Blockchain Anchoring
- **Service**: `AlgorandAnchorService`
- **Network**: Algorand Testnet/Mainnet.
- **Data**: Anchors Asset ID + Falcon Hash.
- **Resilience**: Exponential backoff retries + `PendingAnchor` queue.

### 5. Resilience & Operations
- **RetryWorker**: Reprocesses failed anchors and webhooks.
- **OfflineSync**: `OfflineEventProcessorService` handles buffered mobile scans.
- **Incidents**: `IncidentService` for theft/loss reporting.

## Data Flow
1. **Asset Creation**: Partner API -> `PartnerAsset` created.
2. **Tag Provisioning**: `TagRegistryService` -> `EncoderQueue`.
3. **Encoding**: Worker -> Physical Tag (NFC).
4. **Verification**: Mobile Scan -> API (`/verify`) -> `VerificationService`.
5. **Anchoring**: Async process -> Algorand.

## Security Features
- **Rate Limiting**: In-memory (can be Redis).
- **API Keys**: Scoped access (`asset.read`, `asset.write`).
- **Data Masking**: `PublicAssetService` sanitizes outputs.
- **Audit Logging**: Comprehensive `AuditLog` for all critical actions.
