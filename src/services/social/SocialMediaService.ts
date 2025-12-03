export class SocialMediaService {
    setPauseState(platform: string, state: boolean) {
        console.log(`[SOCIAL] ${platform} paused: ${state}`);
    }
    isPaused(platform: string) {
        return false;
    }
    async relayReply(platform: string, user: string, msg: string) {
        console.log(`[SOCIAL] Relaying to ${user} on ${platform}: ${msg}`);
    }
}
