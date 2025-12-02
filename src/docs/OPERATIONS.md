# Quantum Cert Backend - Operations & Troubleshooting

## Physical Reader Setup (ACR122U)

### Windows
1. Connect ACR122U to USB.
2. Windows should automatically install "Microsoft Usbccid Smartcard Reader (WUDF)".
3. Verify in Device Manager > Smart card readers.
4. **Troubleshooting**:
    - If not detected, install ACS Unified Driver.
    - Ensure "Smart Card" service is running (`services.msc`).

### Linux
1. Install PCSC: `sudo apt install pcscd libpcsclite-dev pcsc-tools`
2. Start service: `sudo systemctl start pcscd`
3. Verify: `pcsc_scan` should show the reader.

## Monitoring

### Logs
- **Application Logs**: Stdout/Stderr (JSON format recommended for prod).
- **Audit Logs**: Stored in `AuditLog` database table. Query via Prisma Studio or Admin API.
- **Incident Logs**: `Incident` table.

### Metrics (Prometheus)
- Endpoint: `GET /metrics` (if enabled in `app.ts`).
- Key Metrics:
    - `http_requests_total`
    - `tag_encoding_success_total`
    - `tag_encoding_failed_total`
    - `anchor_success_total`

## Common Issues

### 1. "Reader not found" (Encoding Worker)
- **Cause**: USB disconnected or driver issue.
- **Fix**: Reconnect USB. Restart `pcscd` (Linux) or Smart Card Service (Windows). Restart Worker.

### 2. "Falcon private key not configured"
- **Cause**: Missing `FALCON_PRIVATE_KEY_SECRET_ID` or IBM Secrets Manager not reachable.
- **Fix**: Check `.env` and network connectivity.

### 3. "Algorand Anchoring Failed"
- **Cause**: Network timeout or insufficient funds (though 0 ALGO txn, fees apply).
- **Fix**: Check `PendingAnchor` table. The `RetryWorker` should handle transient failures automatically.

### 4. "Verification Failed (INVALID_MAC)"
- **Cause**: Tag keys do not match database keys (K_SDM mismatch) or URL parameters tampered.
- **Fix**: Re-encode tag to sync keys. Check `TagVerificationLog` for details.
