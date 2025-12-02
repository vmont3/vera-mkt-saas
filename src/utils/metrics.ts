import client from 'prom-client';

// Create a Registry
export const register = new client.Registry();

// Add default metrics (CPU, Memory, etc.)
client.collectDefaultMetrics({ register });

// Define Metrics
export const metrics = {
    // Verification Metrics
    verify_attempt_total: new client.Counter({
        name: 'verify_attempt_total',
        help: 'Total number of tag verification attempts',
        registers: [register]
    }),
    verify_success_total: new client.Counter({
        name: 'verify_success_total',
        help: 'Total number of successful tag verifications',
        registers: [register]
    }),
    verify_fraud_total: new client.Counter({
        name: 'verify_fraud_total',
        help: 'Total number of fraud attempts detected',
        registers: [register]
    }),

    // SDM Metrics
    sdm_replay_total: new client.Counter({
        name: 'sdm_replay_total',
        help: 'Total number of SDM replay attacks detected',
        registers: [register]
    }),
    sdm_valid_total: new client.Counter({
        name: 'sdm_valid_total',
        help: 'Total number of valid SDM counters processed',
        registers: [register]
    }),

    // Anchoring Metrics
    anchor_success_total: new client.Counter({
        name: 'anchor_success_total',
        help: 'Total number of successful Algorand anchors',
        registers: [register]
    }),
    anchor_fail_total: new client.Counter({
        name: 'anchor_fail_total',
        help: 'Total number of failed Algorand anchors',
        registers: [register]
    }),

    // Worker Metrics
    tag_encoding_success_total: new client.Counter({
        name: 'tag_encoding_success_total',
        help: 'Total number of tags successfully encoded',
        registers: [register]
    }),
    tag_encoding_fail_total: new client.Counter({
        name: 'tag_encoding_fail_total',
        help: 'Total number of tag encoding failures',
        registers: [register]
    }),

    // HTTP Metrics
    http_request_duration_ms: new client.Histogram({
        name: 'http_request_duration_ms',
        help: 'Duration of HTTP requests in ms',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
        registers: [register]
    }),

    // Owner Wallet Metrics
    owner_wallet_list_assets_total: new client.Counter({
        name: 'owner_wallet_list_assets_total',
        help: 'Total number of owner asset list requests',
        registers: [register]
    }),
    owner_transfer_accept_total: new client.Counter({
        name: 'owner_transfer_accept_total',
        help: 'Total number of ownership transfers accepted by owner',
        registers: [register]
    }),
    owner_transfer_reject_total: new client.Counter({
        name: 'owner_transfer_reject_total',
        help: 'Total number of ownership transfers rejected by owner',
        registers: [register]
    }),
    owner_audit_approve_total: new client.Counter({
        name: 'owner_audit_approve_total',
        help: 'Total number of authority audits approved by owner',
        registers: [register]
    }),
    owner_audit_reject_total: new client.Counter({
        name: 'owner_audit_reject_total',
        help: 'Total number of authority audits rejected by owner',
        registers: [register]
    }),

    // Category Template Metrics
    category_template_create_total: new client.Counter({
        name: 'category_template_create_total',
        help: 'Total number of category templates created',
        registers: [register]
    }),
    category_template_update_total: new client.Counter({
        name: 'category_template_update_total',
        help: 'Total number of category templates updated',
        registers: [register]
    }),
    asset_metadata_validation_total: new client.Counter({
        name: 'asset_metadata_validation_total',
        help: 'Total number of asset metadata validations performed',
        registers: [register]
    }),
    asset_metadata_validation_fail_total: new client.Counter({
        name: 'asset_metadata_validation_fail_total',
        help: 'Total number of asset metadata validations failed',
        registers: [register]
    })
};
