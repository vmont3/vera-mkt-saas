import axios from 'axios';

export interface WebhookSubscription {
    id: string;
    tenantId: string;
    url: string;
    events: string[];
    secret: string;
    active: boolean;
}

export class WebhookService {
    private static instance: WebhookService;
    private subscriptions: Map<string, WebhookSubscription[]> = new Map();

    private constructor() { }

    public static getInstance(): WebhookService {
        if (!WebhookService.instance) {
            WebhookService.instance = new WebhookService();
        }
        return WebhookService.instance;
    }

    /**
     * Registers a new webhook for a tenant.
     */
    public async registerWebhook(tenantId: string, url: string, events: string[]): Promise<WebhookSubscription> {
        const subscription: WebhookSubscription = {
            id: `wh-${Date.now()}`,
            tenantId,
            url,
            events,
            secret: `whsec_${Math.random().toString(36).substr(2)}`,
            active: true
        };

        if (!this.subscriptions.has(tenantId)) {
            this.subscriptions.set(tenantId, []);
        }
        this.subscriptions.get(tenantId)?.push(subscription);

        console.log(`[WebhookService] Registered webhook for ${tenantId} -> ${url}`);
        return subscription;
    }

    /**
     * Sends an event to all subscribed webhooks for a tenant.
     */
    public async sendEvent(tenantId: string, event: string, payload: any) {
        const tenantSubs = this.subscriptions.get(tenantId);
        if (!tenantSubs) return;

        const matchingSubs = tenantSubs.filter(sub => sub.active && sub.events.includes(event));

        for (const sub of matchingSubs) {
            this.deliverPayload(sub, event, payload);
        }
    }

    private async deliverPayload(sub: WebhookSubscription, event: string, payload: any, attempt = 1) {
        try {
            console.log(`[WebhookService] Delivering ${event} to ${sub.url} (Attempt ${attempt})`);
            // await axios.post(sub.url, { event, payload }, {
            //   headers: { 'X-Webhook-Secret': sub.secret }
            // });
            // Mock success
        } catch (error) {
            console.error(`[WebhookService] Failed to deliver to ${sub.url}:`, error);
            if (attempt < 3) {
                setTimeout(() => this.deliverPayload(sub, event, payload, attempt + 1), 1000 * attempt);
            }
        }
    }
}
