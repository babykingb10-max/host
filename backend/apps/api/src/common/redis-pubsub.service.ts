import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export type PubSubHandler = (payload: string) => void;

@Injectable()
export class RedisPubSubService implements OnModuleDestroy {
  private readonly publisher: Redis;
  private subscriber: Redis | null = null;
  private readonly handlers = new Map<string, Set<PubSubHandler>>();

  constructor(private readonly config: ConfigService) {
    this.publisher = new Redis(this.config.get<string>('REDIS_URL')!, { maxRetriesPerRequest: 3 });
  }

  async publish(channel: string, payload: unknown): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(payload));
  }

  /** Returns an unsubscribe function. Lazily creates the shared subscriber connection (ioredis requires a dedicated connection once in subscribe mode). */
  async subscribe(channel: string, handler: PubSubHandler): Promise<() => Promise<void>> {
    if (!this.subscriber) {
      this.subscriber = new Redis(this.config.get<string>('REDIS_URL')!, { maxRetriesPerRequest: 3 });
      this.subscriber.on('message', (ch, message) => {
        this.handlers.get(ch)?.forEach((h) => h(message));
      });
    }

    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      await this.subscriber.subscribe(channel);
    }
    this.handlers.get(channel)!.add(handler);

    return async () => {
      this.handlers.get(channel)?.delete(handler);
      if (this.handlers.get(channel)?.size === 0) {
        this.handlers.delete(channel);
        await this.subscriber?.unsubscribe(channel);
      }
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.publisher.quit();
    await this.subscriber?.quit();
  }
}
