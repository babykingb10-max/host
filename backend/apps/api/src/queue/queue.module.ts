import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createRedisClient } from '../common/utils/redis-connection';

/**
 * Central BullMQ wiring. Queue *names* are declared here so health checks
 * and other modules can @InjectQueue() them; the actual worker processors
 * (deployment orchestration, restart/stop/delete, backups, etc.) are
 * registered in apps/api/src/workers/* starting Phase 4, per the phased
 * implementation plan — declaring an empty queue here is not a stub of
 * business logic, it's connection plumbing.
 */
export const QUEUE_NAMES = [
  'deployment',
  'restart',
  'stop',
  'delete',
  'backup',
  'restore',
  'health-check',
  'provider-sync',
  'github',
  'notifications',
  'billing',
  'webhooks',
  'analytics',
  'cron',
] as const;

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      // Pass an already-constructed ioredis client (not a plain options
      // object) — this is the most robust way to guarantee BullMQ uses
      // our exact TLS/family/retry configuration rather than relying on
      // its own pass-through of a raw options object.
      useFactory: (config: ConfigService) => ({
        connection: createRedisClient(config.get<string>('REDIS_URL')!),
      }),
    }),
    BullModule.registerQueue(...QUEUE_NAMES.map((name) => ({ name }))),
  ],
  exports: [BullModule],
})
export class QueueModule {}
