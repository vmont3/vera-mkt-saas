# Quantum Cert — Technical Manual v1.0 (Versão para Impressão)

**Data:** 02 de Dezembro de 2025
**Versão:** 1.0.0
**Status:** RELEASED

---

## SUMÁRIO

1. [Resumo Executivo](#1-resumo-executivo)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Arquitetura de Segurança](#3-arquitetura-de-segurança)
4. [NFC & Codificação NTAG 424 DNA](#4-nfc--codificação-ntag-424-dna)
5. [Criptografia & Blockchain](#5-criptografia--blockchain)
6. [Workers & Resiliência](#6-workers--resiliência)
7. [API Pública Verun-Ready](#7-api-pública-verun-ready)
8. [Guia de Deploy](#8-guia-de-deploy)
9. [Operação & Troubleshooting](#9-operação--troubleshooting)
10. [Conformidade & Normas Internacionais](#10-conformidade--normas-internacionais)

---

## 1. Resumo Executivo

O **Quantum Cert** é uma plataforma de certificação físico-digital projetada para garantir autenticidade, rastreamento e segurança de ativos utilizando:

*   **NTAG 424 DNA (NFC)** com Secure Dynamic Messaging
*   **Falcon-512** (criptografia pós-quântica)
*   **Algorand Blockchain** para ancoragem imutável
*   **Workers assíncronos** para resiliência
*   **APIs públicas Verun-ready** para consultas sem violar privacidade

O sistema foi projetado para alta segurança, escalabilidade e interoperabilidade com serviços externos.

---

## 2. Arquitetura do Sistema

### 2.1 Visão Geral

O Quantum Cert é dividido em camadas independentes:

*   **Layer de Hardware (NFC)** — ACR122U via PC/SC
*   **Layer de Negócio** (Registry, Assets, Verification)
*   **Crypto Layer** — AES-128, CMAC, Falcon-512
*   **Blockchain Layer** — Algorand
*   **Workers Layer** — Encoders, Retry, Webhooks, Offline Sync
*   **Public API Layer** — para consumo externo (Verun)

### 2.2 Fluxo Geral

1.  Registro de ativo via API Partner.
2.  Criação de job na `EncoderQueue`.
3.  Worker codifica tag NTAG 424 DNA.
4.  Tag é escaneada → SDM gera URL dinâmica.
5.  Backend valida CMAC, contador, UID, hash, Falcon signature.
6.  Hash mestre é ancorado na blockchain Algorand.

### 2.3 Módulos Core

*   **Tag Encoding Worker**: `Ntag424Encoder` + `Acr122u Driver`
*   **Registry & Verification Services**: `FalconKeyManager` + `QuantumCryptoService`
*   **Blockchain**: `AlgorandAnchorService` + `RetryWorker`
*   **Offline Event Queue**: Processamento assíncrono
*   **PublicAssetService**: Verun Ready
*   **AuditLog**: Hash-Chain

---

## 3. Arquitetura de Segurança

### 3.1 Post-Quantum Cryptography — Falcon-512

*   Assinatura digital de hashes mestres dos ativos.
*   Armazenamento seguro em KMS (AWS ou IBM).
*   Verificação completa no backend durante cada scan.

### 3.2 Segurança de API

*   **Rate limiting** por endpoint (evita scraping e ataques).
*   **Autenticação via API Keys** com escopos.
*   **Middleware anti-fraude** em camadas (hash, CTR, UID, MAC).
*   Comparação constant-time para evitar ataques de timing.

### 3.3 Privacidade & Proteção de Dados

*   Exposição pública somente de campos limpos e anonimizados.
*   Histórico de proprietários mascarado.
*   Compliance com LGPD/GDPR.
*   Auditoria completa de todos os eventos.

---

## 4. NFC & Codificação NTAG 424 DNA

### 4.1 Driver ACR122U

Totalmente implementado via `nfc-pcsc`. Suporte a:
*   Conexão robusta
*   Transmissão APDU
*   Timeout e reconexão
*   Detecção de tag

### 4.2 EV2 Authentication (AES-128)

O Encoder implementa:
*   EV2 First Authentication
*   Derivação de sessão com AES-CMAC
*   Secure Messaging (MAC + criptografia)
*   Configuração SDM e NDEF
*   Bloqueio One-Time Write

### 4.3 Recursos do NTAG 424 DNA

*   **SDM (Secure Dynamic Messaging)**
*   URL dinâmica por scan
*   Parâmetros `d`, `m`, `ctr`, `uid`
*   NDEF configurado com URL `https://qc/<tid>?{params}`
*   CMAC verificável

---

## 5. Criptografia & Blockchain

### 5.1 AES-128 + CMAC

*   Usado para EV2 e SDM.
*   Biblioteca auditada `aes-cmac`.
*   Implementação validada com vetores oficiais.

### 5.2 Falcon-512

*   Chave privada armazenada em KMS (AES-GCM).
*   Assinatura de hashes SHA-256.
*   Armazenamento do “truncated hash” na tag (SDM).

### 5.3 Algorand Blockchain Anchoring

*   Tx 0 ALGO contendo payload JSON do ativo.
*   Exponential backoff.
*   `PendingAnchor` para retries.
*   Worker dedicado.

---

## 6. Workers & Resiliência

### 6.1 Encoding Worker
Processamento físico das tags.

### 6.2 Retry Worker
Reprocessa:
*   `PendingAnchor`
*   Webhooks
*   Offline Events

### 6.3 Offline Sync Worker
Processa scans feitos offline pelo app.

---

## 7. API Pública Verun-Ready

### 7.1 Conceito
Expor dados totalmente seguros, anônimos e auditáveis, preparados para indexação por Verun.

### 7.2 Endpoints
*   `GET /public/assets/:publicId`
*   `GET /public/assets/:publicId/incidents`
*   `GET /public/assets/:publicId/anchors`

### 7.3 Regras de Privacidade
Os endpoints **NÃO** podem expor:
*   UID
*   truncatedHash
*   masterHash
*   documentos
*   dados pessoais
*   IDs internos

Tudo é mascarado via DTOs públicos.

---

## 8. Guia de Deploy

### 8.1 Requisitos
*   Node 18+
*   PostgreSQL 14+
*   PC/SC Active (Windows/Linux)
*   ACR122U (USB)

### 8.2 Setup
```bash
git clone <repo>
npm install
cp .env.example .env
npx prisma migrate deploy
npm start
```

### 8.3 Workers
```bash
npm run start-encoding-worker
npm run start-retry-worker
npm run start-offline-sync
```

---

## 9. Operação & Troubleshooting

### 9.1 ACR122U — problemas comuns

*   **“Reader not found”**
    *   Reinstalar driver PC/SC
    *   Reiniciar serviço SCardSvr
    *   Trocar porta USB
    *   Verificar cabo

*   **“INVALID_MAC”**
    *   Reencode necessário (chaves inconsistentes)

*   **“CTR REPLAY DETECTED”**
    *   Tentativa de fraude
    *   **Ação**: Notificação interna ao proprietário (Dashboard/Push)
    *   *Nota: O Verun System NÃO recebe alertas técnicos de replay.*

*   **“FalconKey error”**
    *   Validar integração com KMS

---

## 10. Conformidade & Normas Internacionais

### NIST
*   **Falcon-512** (PQC)
*   **AES-128**
*   **SHA-256**
*   **CMAC** (SP 800-38B)

### ISO/IEC
*   **14443** (NFC Contactless)
*   **7816-4** (APDU structure)

### GDPR / LGPD
*   Minimização
*   Anonimização
*   Right to Erasure
*   Auditoria completa
