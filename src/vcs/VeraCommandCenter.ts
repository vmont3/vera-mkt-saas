import { Telegraf, Context } from 'telegraf';

export class VeraCommandCenter {
    private static instance: VeraCommandCenter;
    private bot: Telegraf;
    private adminChatIds: string[] = [];

    private constructor() {
        // In a real app, token comes from env
        this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || 'mock_token');
        this.initializeCommands();
    }

    public static getInstance(): VeraCommandCenter {
        if (!VeraCommandCenter.instance) {
            VeraCommandCenter.instance = new VeraCommandCenter();
        }
        return VeraCommandCenter.instance;
    }

    private initializeCommands() {
        this.bot.command('status', this.handleStatus.bind(this));
        this.bot.command('deploy', this.handleDeploy.bind(this));
        this.bot.command('emergency_stop', this.handleEmergencyStop.bind(this));

        // Middleware to check admin auth
        this.bot.use(async (ctx, next) => {
            if (this.isAdmin(ctx)) {
                return next();
            }
            return ctx.reply('⛔ Access Denied');
        });
    }

    private isAdmin(ctx: Context): boolean {
        // Mock check
        return true;
        // return this.adminChatIds.includes(String(ctx.chat?.id));
    }

    private async handleStatus(ctx: Context) {
        await ctx.reply('✅ System Operational\nCPU: 12%\nMemory: 450MB\nActive Agents: 5');
    }

    private async handleDeploy(ctx: Context) {
        await ctx.reply('🚀 Deploy sequence initiated...');
        // Trigger deployment logic
        setTimeout(() => ctx.reply('✅ Deployment Successful! v5.0.1 is live.'), 2000);
    }

    private async handleEmergencyStop(ctx: Context) {
        await ctx.reply('⚠️ EMERGENCY STOP TRIGGERED. Halting all agents...');
        // Logic to pause all queues
    }

    public async start() {
        console.log('[VeraCommandCenter] Bot started');
        // this.bot.launch(); // Commented out to prevent actual connection attempts in dev without token
    }

    public async notifyAdmins(message: string) {
        console.log(`[VeraCommandCenter] Notification: ${message}`);
        // for (const id of this.adminChatIds) {
        //   await this.bot.telegram.sendMessage(id, message);
        // }
    }

    /**
     * Sends a content approval request to Admins via Telegram.
     */
    public async sendApprovalRequest(taskId: string, copy: string, imagePrompt: string) {
        console.log(`[VeraCommandCenter] Sending Approval Request for Task ${taskId}`);

        const message = `
🗳️ **APPROVAL REQUEST**
Task: ${taskId}

📝 **Copy:**
${copy.substring(0, 200)}...

🎨 **Visual Prompt:**
${imagePrompt.substring(0, 100)}...

*Vote below:*
        `;

        // Mock sending a poll/keyboard
        // const poll = await this.bot.telegram.sendPoll(this.adminChatIds[0], 'Approve this content?', ['✅ Approve', '❌ Reject', '✏️ Edit'], { is_anonymous: false });

        // Simulate waiting for votes (Mock Logic)
        this.simulateVoting(taskId);
    }

    /**
     * Simulates the voting process for demonstration.
     */
    private simulateVoting(taskId: string) {
        setTimeout(() => {
            console.log(`[VeraCommandCenter] ✅ Admin approved Task ${taskId} (Vote: 1/1)`);
            this.handleApproval(taskId, true);
        }, 5000);
    }

    private handleApproval(taskId: string, approved: boolean) {
        if (approved) {
            console.log(`[VeraCommandCenter] Task ${taskId} APPROVED. Publishing...`);
            // Call Publisher Agent (or update DB status)
        } else {
            console.log(`[VeraCommandCenter] Task ${taskId} REJECTED. Returning to Creator.`);
        }
    }
}
