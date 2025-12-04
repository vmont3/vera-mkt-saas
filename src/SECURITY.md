# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

*   **Database**: Parameterized queries via Prisma (No SQL Injection).
*   **Infrastructure**:
    *   Non-root Docker containers.
    *   Read-only root filesystems where possible.
    *   Secrets management via Google Secret Manager (`sm://` notation).
*   **Network**: Strict CORS whitelist.
*   **Logging**: Audit logs for all sensitive actions (BigQuery).

## Audit History

*   **2025-12-02**: Critical Security Audit & Remediation (Fixes: execSync, SQLi, JWT, Docker).

## 4. Security Architecture

```mermaid
graph TB
    subgraph "Perímetro de Segurança"
        WAF[Cloudflare WAF<br/>Rate Limiting<br/>DDoS Protection]
        LB[Load Balancer<br/>SSL Termination]
    end

    subgraph "Camada de Aplicação (Google Cloud)"
        API[GKE Cluster<br/>runAsNonRoot<br/>readOnlyRootFilesystem]
        SA[Service Account<br/>Workload Identity<br/>Princípio do Menor Privilégio]
    end

    subgraph "Camada de Dados"
        DB[(PostgreSQL<br/>Cloud SQL<br/>SSL Only<br/>Private IP)]
        Redis[(Redis Memorystore<br/>Auth Enabled<br/>VPC peering)]
        Pinecone[(Pinecone VectorDB<br/>API Key in Secret Manager)]
    end

    subgraph "Secret Management"
        SM[Google Secret Manager<br/>sm://quantum-cert/*<br/>Rotation automática]
        KM[Cloud KMS<br/>Encrypt RSA Keys<br/>Algorand Mnemonic]
    end

    subgraph "Blockchain"
        Algo[Algorand Node<br/>KMD + Ledger Nano<br/>Multi-sig Wallet]
    end

    subgraph "Observabilidade"
        Log[Cloud Logging<br/>Audit Logs<br/>SIEM Integration]
        Mon[Cloud Monitoring<br/>Uptime Check<br/>Alert Policies]
        BQ[BigQuery<br/>Security Analytics<br/>Compliance Reports]
    end

    WAF --> LB
    LB --> API
    API --> SA
    API --> DB
    API --> Redis
    API --> Pinecone
    SA --> SM
    SM --> KM
    API --> Algo
    API --> Log
    Log --> BQ
    Mon --> API
```

