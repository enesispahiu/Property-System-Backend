import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly redis: Redis;
  private readonly ttlSeconds: number;

  constructor(configService: ConfigService) {
    const host = configService.get<string>('REDIS_HOST') || 'localhost';
    const port = Number(configService.get<string>('REDIS_PORT') || 6379);
    this.ttlSeconds = Number(
      configService.get<string>('REDIS_TTL_SECONDS') || 60,
    );

    this.redis = new Redis({
      host,
      port,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });

    this.redis.on('error', (error) => {
      this.logger.warn(`Redis unavailable: ${error.message}`);
    });
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);

      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as T;
    } catch (error) {
      this.logger.warn(
        `Redis cache read skipped for ${key}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds = this.ttlSeconds) {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(
        `Redis cache write skipped for ${key}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  async deleteByPattern(pattern: string) {
    try {
      let cursor = '0';

      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logger.warn(
        `Redis cache invalidation skipped for ${pattern}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  async onModuleDestroy() {
    this.redis.disconnect();
  }
}
