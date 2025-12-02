# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of our systems seriously. If you believe you have found a security vulnerability in the Quantum Cert Backend, please report it to us as described below.

**Do not report security vulnerabilities through public GitHub issues.**

### Disclosure Policy

1.  Please report vulnerabilities by emailing **security@quantumcert.com**.
2.  We will acknowledge receipt of your report within 48 hours.
3.  We will provide an estimated timeframe for addressing the vulnerability.
4.  We ask that you do not disclose the vulnerability to the public until we have had a reasonable opportunity to fix it.

## Security Best Practices Implemented

*   **Authentication**: RS256 JWT with key rotation.
*   **Database**: Parameterized queries via Prisma (No SQL Injection).
*   **Infrastructure**:
    *   Non-root Docker containers.
    *   Read-only root filesystems where possible.
    *   Secrets management via Google Secret Manager (`sm://` notation).
*   **Network**: Strict CORS whitelist.
*   **Logging**: Audit logs for all sensitive actions (BigQuery).

## Audit History

*   **2025-12-02**: Critical Security Audit & Remediation (Fixes: execSync, SQLi, JWT, Docker).
