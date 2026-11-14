import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import { Redis } from 'ioredis';

export interface ChatStreamEvent {
  type: 'CONNECTED' | 'PING' | 'NEW_MESSAGE' | 'CONVERSATION_UPDATED' | 'MESSAGE_STATUS';
  companyId: string;
  conversationId?: string;
  message?: any;
  conversation?: any;
  patch?: Record<string, any>;
  timestamp?: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly instanceId = crypto.randomUUID();
  private readonly localEmitter = new EventEmitter();
  private client: Redis | null = null;
  private subscriberClient: Redis | null = null;
  private readonly activeChannels = new Set<string>();
  private readonly inMemoryCache = new Set<string>();

  constructor() {
    this.localEmitter.setMaxListeners(200);
  }

  onModuleInit() {
    this.initClient();
  }

  private initClient() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
        retryStrategy: (times) => Math.min(times * 200, 5000),
      });

      this.client.on('error', (err) => {
        this.logger.warn(`[RedisService] Connection warning: ${err.message}`);
      });

      this.client.connect().catch((err) => {
        this.logger.warn(`[RedisService] Initial connection failed (${err.message}). In-memory fallback active.`);
      });

      // Dedicated Redis connection for subscriptions (ioredis requirement)
      this.subscriberClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
        retryStrategy: (times) => Math.min(times * 200, 5000),
      });

      this.subscriberClient.on('error', (err) => {
        this.logger.warn(`[RedisService Subscriber] Connection warning: ${err.message}`);
      });

      this.subscriberClient.on('message', (chan, raw) => {
        try {
          const parsed = JSON.parse(raw);
          // Drop if published by this exact instance to avoid double local emission
          if (parsed?.__originId && parsed.__originId === this.instanceId) return;
          const data = parsed?.__originId ? parsed.data : parsed;
          this.localEmitter.emit(chan, data);
        } catch (err: any) {
          this.logger.warn(`[RedisService] Failed to parse message on ${chan}: ${err.message}`);
        }
      });

      this.subscriberClient.connect().then(() => {
        // Re-subscribe any channels registered before connection completed
        for (const channel of this.activeChannels) {
          this.subscriberClient?.subscribe(channel).catch(() => {});
        }
      }).catch(() => {
        // In-memory fallback active
      });
    } catch (err: any) {
      this.logger.warn(`[RedisService] Redis initialization error (${err.message}). In-memory fallback active.`);
      this.client = null;
      this.subscriberClient = null;
    }
  }

  /**
   * Publish an event to a Redis channel and locally to any active in-process listeners.
   */
  async publish(channel: string, data: any): Promise<void> {
    if (!channel) return;

    // 1. Deliver to local listeners with sub-millisecond latency
    this.localEmitter.emit(channel, data);

    // 2. Publish to Redis so other server instances/workers receive it
    if (this.client && this.client.status === 'ready') {
      try {
        const payload = JSON.stringify({ __originId: this.instanceId, data });
        await this.client.publish(channel, payload);
      } catch (err: any) {
        this.logger.warn(`[RedisService] Publish to ${channel} failed (${err.message})`);
      }
    }
  }

  /**
   * Subscribe to a channel. Returns an unsubscribe function.
   */
  subscribe(channel: string, handler: (data: any) => void): () => void {
    if (!channel) return () => {};

    this.localEmitter.on(channel, handler);

    if (!this.activeChannels.has(channel)) {
      this.activeChannels.add(channel);
      if (this.subscriberClient && (this.subscriberClient.status === 'ready' || this.subscriberClient.status === 'connecting')) {
        this.subscriberClient.subscribe(channel).catch(() => {});
      }
    }

    return () => {
      this.localEmitter.off(channel, handler);
      if (this.localEmitter.listenerCount(channel) === 0) {
        this.activeChannels.delete(channel);
        if (this.subscriberClient && this.subscriberClient.status === 'ready') {
          this.subscriberClient.unsubscribe(channel).catch(() => {});
        }
      }
    };
  }

  /**
   * Broadcast a real-time chat event to all clients connected for the given company.
   */
  async publishChatEvent(companyId: string, event: Omit<ChatStreamEvent, 'companyId'>): Promise<void> {
    if (!companyId) return;
    const channel = `chat:company:${companyId}`;
    await this.publish(channel, {
      ...event,
      companyId,
      timestamp: event.timestamp || Date.now(),
    });
  }

  /**
   * Listen to real-time chat events for a given company. Returns unsubscription teardown.
   */
  subscribeToChatEvents(companyId: string, handler: (event: ChatStreamEvent) => void): () => void {
    if (!companyId) return () => {};
    const channel = `chat:company:${companyId}`;
    return this.subscribe(channel, handler);
  }

  /**
   * Atomically reserve a webhook event ID / mid / comment ID using Redis SETNX with expiration.
   * Returns true if reservation was successful (new event, process it).
   * Returns false if event was already reserved or processed (duplicate event, drop it).
   */
  async reserveWebhookEvent(eventId: string, ttlSeconds = 86400): Promise<boolean> {
    if (!eventId || typeof eventId !== 'string') return true;
    const key = `webhook:dedup:${eventId.trim()}`;

    if (this.client && this.client.status === 'ready') {
      try {
        const result = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      } catch (err: any) {
        this.logger.warn(`[RedisService] Redis reserve error (${err.message}), using fallback.`);
      }
    }

    // In-memory fallback (used in dev/test or when Redis is unreachable)
    if (this.inMemoryCache.has(key)) {
      return false;
    }

    // Prune cache if it grows excessively under offline load
    if (this.inMemoryCache.size >= 10000) {
      const firstEntry = this.inMemoryCache.values().next().value;
      if (firstEntry) this.inMemoryCache.delete(firstEntry);
    }

    this.inMemoryCache.add(key);
    setTimeout(() => {
      this.inMemoryCache.delete(key);
    }, Math.min(ttlSeconds * 1000, 3600000)).unref?.();

    return true;
  }

  /**
   * Check if an event was already processed without reserving (for debug/inspection).
   */
  async isEventReserved(eventId: string): Promise<boolean> {
    if (!eventId) return false;
    const key = `webhook:dedup:${eventId.trim()}`;

    if (this.client && this.client.status === 'ready') {
      try {
        const val = await this.client.get(key);
        return val !== null;
      } catch {
        // Fall back to memory
      }
    }

    return this.inMemoryCache.has(key);
  }

  /**
   * Release reservation (e.g. for testing or rollbacks).
   */
  async releaseEvent(eventId: string): Promise<void> {
    if (!eventId) return;
    const key = `webhook:dedup:${eventId.trim()}`;
    this.inMemoryCache.delete(key);

    if (this.client && this.client.status === 'ready') {
      try {
        await this.client.del(key);
      } catch {
        // Non-fatal
      }
    }
  }

  async onModuleDestroy() {
    if (this.subscriberClient) {
      try {
        await this.subscriberClient.quit();
      } catch {
        this.subscriberClient.disconnect();
      }
    }
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
    }
    this.localEmitter.removeAllListeners();
  }
}
