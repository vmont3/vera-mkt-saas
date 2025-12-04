import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { EventEmitter } from 'events';

export class NotificationService {
    private eventEmitter: EventEmitter;
    private logger = console;

    constructor() {
        this.eventEmitter = new EventEmitter();
    }

    /**
     * Subscribe to Asset Updates with Cleanup (Fix Memory Leak)
     */
    subscribeToAsset(assetId: string) {
        return new Observable((subscriber: any) => {
            const listener = (data: any) => subscriber.next(data);
            this.eventEmitter.on(assetId, listener);

            return () => { // Cleanup function
                this.eventEmitter.off(assetId, listener);
            };
        }).pipe(
            finalize(() => this.logger.log(`Unsubscribed from ${assetId}`))
        );
    }
}
