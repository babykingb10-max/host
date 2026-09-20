import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('REDIS_URL') },
      }),
    }),
    BullModule.registerQueue(...QUEUE_NAMES.map((name) => ({ name }))),
  ],
  exports: [BullModule],
})
export class QueueModule {}
