import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  constructor(private configService: ConfigService) {
    this.client = createClient({
      url: this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
  }

  async onModuleInit() {
    await this.client.connect();
    console.log('redis connected');
  }

  async onModuleDestroy() {
    await this.client.disconnect();
  }

  getClient(): RedisClientType {
    return this.client;
  }

  async ping() {
    return this.client.ping();
  }

  async hSet(key: string, data: Record<string, string | number | Buffer>) {
    return this.client.hSet(key, data);
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    return this.client.hGetAll(key);
  }

  async del(key: string) {
    return this.client.del(key);
  }

  /**
   * Non-blocking replacement for `KEYS`. Iterates the keyspace via `SCAN`,
   * letting Redis process other commands between batches.
   * @param pattern - Glob-style pattern (e.g. `session:*`).
   * @param count - Advisory batch size hint sent to Redis (default 100).
   * @returns All matching keys collected across the scan.
   */
  async scanKeys(pattern: string, count = 100): Promise<string[]> {
    const keys: string[] = [];
    for await (const key of this.client.scanIterator({ MATCH: pattern, COUNT: count })) {
      keys.push(key);
    }
    return keys;
  }

  async exists(key: string) {
    return this.client.exists(key);
  }

  async set(key: string, value: string) {
    return this.client.set(key, value);
  }

  async get(key: string) {
    return this.client.get(key);
  }
}
