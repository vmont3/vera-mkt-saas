import { Telegraf, Context } from 'telegraf';
import { AgentOrchestrator } from './agents/AgentOrchestrator';
import { SocialMediaService } from '../social/SocialMediaService';
import { KnowledgeBaseService } from './KnowledgeBaseService';
import { AnalyticsService } from '../analytics/AnalyticsService';
import { CronService } from '../scheduler/CronService';
import { ReelsFactory } from './reels/ReelsFactory';
import { PartnerIntegrationHub } from '../partners/PartnerIntegrationHub';

export class VeraChatService {
    private bot!: Telegraf;
    private cmo!: AgentOrchestrator;
    private social!: SocialMediaService;
    private kb!: KnowledgeBaseService;
    private analytics!: AnalyticsService;
    private scheduler!: CronService;
    private reels!: ReelsFactory;
    private partners!: PartnerIntegrationHub;
    private isPaused: boolean = false;
    private adminGroupId: string | null = null;
    private pendingMessages: Map<number, string[]> = new Map();

    constructor() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
            console.warn('[VERA-CHAT] No TELEGRAM_BOT_TOKEN found. Chat service disabled.');
            return;
        }

        this.bot = new Telegraf(token);
        this.cmo = new AgentOrchestrator();
        this.social = new SocialMediaService(); // Connect to Command Center
        this.kb = new KnowledgeBaseService();   // Connect to Brain
        this.analytics = new AnalyticsService(); // Connect to Analyst
        this.scheduler = new CronService();      // Connect to Clock
        this.reels = new ReelsFactory();         // Connect to Studio
        this.partners = new PartnerIntegrationHub(); // Connect to Ecosystem
        this.adminGroupId = process.env.TELEGRAM_ADMIN_GROUP_ID || null;

        this.initializeCommands();
        this.initializeMessageHandler();

        // Start Bot
        this.bot.launch().then(() => {
            console.log('[VERA-CHAT] Telegram Bot Online');
        }).catch(err => {
            console.error('[VERA-CHAT] Failed to launch bot:', err);
        });

        // Graceful Stop
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }

    private initializeCommands() {
        // Middleware to check Admin
        const isAdmin = (ctx: any) => {
            const adminIds = (process.env.TELEGRAM_ADMIN_IDS || '').split(',').map(id => parseInt(id.trim()));
            // Also allow if message is from the Admin Group
            const isGroupAdmin = this.adminGroupId && ctx.chat.id.toString() === this.adminGroupId;
            return adminIds.includes(ctx.from.id) || isGroupAdmin;
        };

        // Start
        this.bot.command('start', (ctx) => {
            ctx.reply('Olá! Sou a Vera. 🤖\n\nComandos:\n/pause [all|insta|zap] - Pausar respostas\n/resume [all|insta|zap] - Reativar respostas\n/reply <plat> <user> <msg> - Responder cliente\n/learn <pergunta> | <resposta> - Ensinar\n/status - Ver status atual\n/viral <topic> - Criar Reel');
        });

        // Pause (Omni-Channel)
        this.bot.command('pause', (ctx) => {
            if (!isAdmin(ctx)) return ctx.reply('⛔ Acesso negado.');
            
            const args = ctx.message.text.split(' ').slice(1);
            const target = args[0] ? args[0].toUpperCase() : 'ALL';

            if (target === 'ALL') {
                this.isPaused = true; // Pause Telegram
                this.social.setPauseState('INSTAGRAM', true);
                this.social.setPauseState('WHATSAPP', true);
                this.social.setPauseState('LINKEDIN', true);
                ctx.reply('⏸️ **PAUSE GERAL**.\nTodos os canais (Telegram, Insta, Zap, LinkedIn) estão mudos.');
            } else {
                this.social.setPauseState(target, true);
                ctx.reply(`⏸️ **${target} Pausado**.\nVera não responderá lá.`);
            }
        });

        // Resume (Omni-Channel)
        this.bot.command('resume', async (ctx) => {
            if (!isAdmin(ctx)) return ctx.reply('⛔ Acesso negado.');

            const args = ctx.message.text.split(' ').slice(1);
            const target = args[0] ? args[0].toUpperCase() : 'ALL';

            if (target === 'ALL') {
                this.isPaused = false;
                this.social.setPauseState('INSTAGRAM', false);
                this.social.setPauseState('WHATSAPP', false);
                this.social.setPauseState('LINKEDIN', false);
                await ctx.reply('▶️ **RESUME GERAL**.\nVoltando a operar em todos os canais.');
                await this.processPendingMessages();
            } else {
                this.social.setPauseState(target, false);
                ctx.reply(`▶️ **${target} Ativo**.\nVera voltou a responder lá.`);
            }
        });

        // Relay Command: /reply <platform> <user> <msg>
        this.bot.command('reply', async (ctx) => {
            if (!isAdmin(ctx)) return;

            const args = ctx.message.text.split(' ');
            if (args.length < 4) return ctx.reply('⚠️ Uso: /reply <plataforma> <usuario> <mensagem>');

            const platform = args[1];
            const user = args[2];
            const msg = args.slice(3).join(' ');

            try {
                // 1. Send to User
                await this.social.relayReply(platform, user, msg);
                
                // 2. Learn (Save to KB) - Implicit Learning
                ctx.reply(`✅ Enviado para ${user} no ${platform}.`);
            } catch (e) {
                ctx.reply(`❌ Erro: ${e}`);
            }
        });

        // Command to explicitly teach: /learn <question> | <answer>
        this.bot.command('learn', (ctx) => {
            if (!isAdmin(ctx)) return;
            
            const content = ctx.message.text.substring(7); // Remove '/learn '
            const parts = content.split('|');
            
            if (parts.length !== 2) {
                return ctx.reply('⚠️ Uso: /learn Pergunta | Resposta');
            }

            const question = parts[0].trim();
            const answer = parts[1].trim();

            this.kb.addEntry(question, answer);
            ctx.reply('🧠 **Aprendido!** Adicionei ao meu cérebro.');
        });

        // Report Command: /report
        this.bot.command('report', (ctx) => {
            if (!isAdmin(ctx)) return;
            const report = this.analytics.generateReport();
            ctx.reply(report);
        });

        // Viral Command: /viral <topic>
        this.bot.command('viral', async (ctx) => {
            if (!isAdmin(ctx)) return;
            const topic = ctx.message.text.substring(7) || 'Quantum Tech';
            
            ctx.reply('🎬 Luz, Câmera... Criando Reel!');
            const reel = await this.reels.produceReel({ topic, persona: 'TECH' });
            
            await ctx.replyWithPhoto(reel.visual, {
                caption: `🎥 **Roteiro Viral Gerado**\n\n${reel.script.caption}\n\nScore Previsto: ${reel.estimatedViralScore}/100`
            });
        });

        // Status
        this.bot.command('status', (ctx) => {
            const status = this.isPaused ? '⏸️ PAUSADA (Modo Humano)' : '▶️ ONLINE (Modo IA)';
            const insta = this.social.isPaused('INSTAGRAM') ? '⏸️' : '▶️';
            const zap = this.social.isPaused('WHATSAPP') ? '⏸️' : '▶️';
            
            ctx.reply(`Status Geral: ${status}\nInsta: ${insta} | Zap: ${zap}`);
        });
    }

    private initializeMessageHandler() {
        this.bot.on('text', async (ctx) => {
            const chatId = ctx.chat.id;
            const text = ctx.message.text;

            // 1. Ignore Commands
            if (text.startsWith('/')) return;

            // 2. Check if Paused
            if (this.isPaused) {
                // Store message in queue for catch-up
                const current = this.pendingMessages.get(chatId) || [];
                current.push(text);
                this.pendingMessages.set(chatId, current);
                console.log(`[VERA-CHAT] Paused. Queued message from ${chatId}: "${text}"`);
                return;
            }

            // 3. Ignore Group Messages unless tagged (Optional)
            if (ctx.chat.type !== 'private' && !text.includes('Vera')) return;

            await this.handleMessage(ctx, text);
        });
    }

    private async handleMessage(ctx: any, text: string) {
        try {
            await ctx.sendChatAction('typing');
            
            // 1. Search Knowledge Base
            const kbAnswer = this.kb.search(text);

            if (kbAnswer) {
                // Found a verified answer!
                console.log(`[VERA-CHAT] Found KB answer for: "${text}"`);
                await ctx.reply(kbAnswer);
            } else {
                // 2. Don't Know -> Escalate
                console.log(`[VERA-CHAT] No KB answer for: "${text}". Escalating.`);
                
                // Notify Admin
                if (this.adminGroupId) {
                    await this.bot.telegram.sendMessage(this.adminGroupId, `🚨 **Vera Precisa de Ajuda**\n\nUsuário: ${ctx.from.first_name}\nPergunta: "${text}"\n\n⚠️ Não encontrei na base de dados. Use /reply ou /learn para me ensinar.`);
                }

                // Reply to User (Holding pattern)
                await ctx.reply('Vou verificar essa informação com um especialista e já te retorno! ⏳');
            }
        } catch (error) {
            console.error('[VERA-CHAT] Error processing message:', error);
        }
    }

    private async processPendingMessages() {
        if (this.pendingMessages.size === 0) return;

        console.log(`[VERA-CHAT] Processing pending messages for ${this.pendingMessages.size} chats...`);

        for (const [chatId, messages] of this.pendingMessages.entries()) {
            if (messages.length === 0) continue;

            // Logic: Respond to the CONTEXT of all missed messages
            // For now, we'll just acknowledge the last one or a summary
            const combinedContext = messages.join('\n');

            try {
                // Send a "Catch-up" response
                await this.bot.telegram.sendMessage(chatId, `[Vera] Desculpe a demora! Estava em manutenção. Li suas mensagens:\n"${combinedContext}"\n\nComo posso ajudar agora?`);
            } catch (error) {
                console.error(`[VERA-CHAT] Failed to catch up with ${chatId}:`, error);
            }
        }

        // Clear queue
        this.pendingMessages.clear();
    }

    /**
     * Send Marketing Draft for Approval
     */
    async sendDraftForApproval(text: string, imageUrl: string, callbackData: string) {
        if (!this.adminGroupId) {
            console.warn('[VERA-CHAT] No Admin Group ID configured. Cannot send draft.');
            return;
        }

        try {
            await this.bot.telegram.sendPhoto(this.adminGroupId, imageUrl, {
                caption: `📝 **Novo Post Sugerido**\n\n${text}\n\nO que acham?`,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ APROVAR', callback_data: `approve_${callbackData}` },
                            { text: '❌ REJEITAR', callback_data: `reject_${callbackData}` }
                        ]
                    ]
                }
            });
        } catch (error) {
            console.error('[VERA-CHAT] Failed to send draft:', error);
        }
    }
}
