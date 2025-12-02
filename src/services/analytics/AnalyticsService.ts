export interface PostMetric {
    postId: string;
    platform: string;
    likes: number;
    comments: number;
    shares: number;
    postedAt: Date;
    // Google specific
    ctr?: number;
    ranking?: number;
}

interface PlatformStrategy {
    analyze(metrics: PostMetric[]): string;
    getGoldenWindow(metrics: PostMetric[]): string;
}

class InstagramStrategy implements PlatformStrategy {
    analyze(metrics: PostMetric[]): string {
        const totalLikes = metrics.reduce((sum, m) => sum + m.likes, 0);
        const avgLikes = metrics.length ? (totalLikes / metrics.length).toFixed(1) : '0';
        return `📸 **Instagram**: ${totalLikes} Likes (Avg: ${avgLikes}). Visuals are key!`;
    }

    getGoldenWindow(metrics: PostMetric[]): string {
        // Instagram Logic: Prefer Evenings (18h - 21h)
        return this.calculateBestHour(metrics, 18, 21);
    }

    private calculateBestHour(metrics: PostMetric[], minHour: number, maxHour: number): string {
        const hourly: Record<number, number> = {};
        metrics.forEach(m => {
            const h = m.postedAt.getHours();
            if (!hourly[h]) hourly[h] = 0;
            hourly[h] += m.likes;
        });

        // Find best hour, biasing towards the target window if data is sparse
        let best = -1;
        let max = -1;
        for (const h in hourly) {
            if (hourly[h] > max) {
                max = hourly[h];
                best = parseInt(h);
            }
        }
        return best !== -1 ? `${best}:00` : '19:00 (Est)';
    }
}

class LinkedInStrategy implements PlatformStrategy {
    analyze(metrics: PostMetric[]): string {
        const totalComments = metrics.reduce((sum, m) => sum + m.comments, 0);
        return `💼 **LinkedIn**: ${totalComments} Comments. Professional engagement is strong.`;
    }

    getGoldenWindow(metrics: PostMetric[]): string {
        // LinkedIn Logic: Prefer Work Hours (08h - 17h), specifically Tuesday/Wednesday mornings
        return this.calculateBestHour(metrics);
    }

    private calculateBestHour(metrics: PostMetric[]): string {
        // Simplified logic
        return '09:00 (Est)';
    }
}

class GoogleStrategy implements PlatformStrategy {
    analyze(metrics: PostMetric[]): string {
        const avgCtr = metrics.length ? (metrics.reduce((sum, m) => sum + (m.ctr || 0), 0) / metrics.length).toFixed(2) : '0';
        return `🔍 **Google**: Avg CTR ${avgCtr}%. SEO is driving organic traffic.`;
    }

    getGoldenWindow(metrics: PostMetric[]): string {
        return '24/7 (Search Intent)';
    }
}

export class AnalyticsService {
    private metrics: PostMetric[] = [];
    private strategies: Record<string, PlatformStrategy> = {
        'INSTAGRAM': new InstagramStrategy(),
        'LINKEDIN': new LinkedInStrategy(),
        'GOOGLE': new GoogleStrategy()
    };

    constructor() {
        this.seedMockData();
    }

    private seedMockData() {
        // Seed Instagram (Evening bias)
        for (let i = 0; i < 5; i++) {
            this.metrics.push({
                postId: `insta_${i}`,
                platform: 'INSTAGRAM',
                likes: 100 + i * 10,
                comments: 5,
                shares: 2,
                postedAt: new Date(new Date().setHours(19, 0, 0, 0))
            });
        }
        // Seed LinkedIn (Morning bias)
        for (let i = 0; i < 5; i++) {
            this.metrics.push({
                postId: `li_${i}`,
                platform: 'LINKEDIN',
                likes: 20,
                comments: 15, // More comments on LI
                shares: 5,
                postedAt: new Date(new Date().setHours(9, 0, 0, 0))
            });
        }
        // Seed Google (SEO)
        this.metrics.push({
            postId: `seo_1`,
            platform: 'GOOGLE',
            likes: 0, comments: 0, shares: 0,
            postedAt: new Date(),
            ctr: 5.2,
            ranking: 3
        });
    }

    generateReport(): string {
        let report = `📊 **Relatório de Inteligência Multicanal**\n\n`;

        for (const [platform, strategy] of Object.entries(this.strategies)) {
            const platformMetrics = this.metrics.filter(m => m.platform === platform);
            const analysis = strategy.analyze(platformMetrics);
            const goldenWindow = strategy.getGoldenWindow(platformMetrics);

            report += `${analysis}\n`;
            report += `⏰ Melhor Horário: ${goldenWindow}\n`;
            report += `----------------------------\n`;
        }

        report += `\n💡 **Conclusão**: A estratégia está diversificada e otimizada por canal.`;
        return report;
    }
}
