#!/bin/bash

# Quantum Cert - Security Infrastructure Setup
# Usage: ./setup-security-infra.sh

echo "🛡️ Starting Security Infrastructure Setup..."

# 1. Google Cloud - Network Isolation
echo "Configuring VPC and Firewall..."
gcloud compute networks create quantum-vpc --subnet-mode=custom

# Firewall: Allow only Load Balancer to access API
gcloud compute firewall-rules create api-allow-lb \
  --network quantum-vpc \
  --source-ranges 35.191.0.0/16,130.211.0.0/22 \
  --target-tags api-server \
  --allow tcp:8080

# 2. Cloudflare - WAF Configuration
echo "Configuring Cloudflare WAF..."
if [ -z "$ZONE_ID" ] || [ -z "$CF_API_TOKEN" ]; then
    echo "⚠️  Skipping Cloudflare setup: ZONE_ID or CF_API_TOKEN not set."
else
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/firewall/rules" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "description": "Block SQLi attempts",
        "filter": {
          "expression": "http.request.uri.query contains \"SELECT\" or http.request.uri.query contains \"DROP\""
        },
        "action": "block"
      }'
fi

echo "✅ Infrastructure Setup Complete."
