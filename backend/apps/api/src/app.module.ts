import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { validateEnv } from './common/constants/env.schema';
import { PrismaModule } from './common/prisma.module';
import { GlobalExceptionFilter } from './common/errors/global-exception.filter';
import { ResponseEnvelopeInterceptor } from './common/utils/response-envelope.interceptor';
import { RequestIdMiddleware } from './common/logging/request-id.middleware';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ServicesModule } from './services/services.module';
import { ProjectsModule } from './projects/projects.module';
import { ProvidersModule } from './providers/providers.module';
import { DeploymentsModule } from './deployments/deployments.module';
import { GithubModule } from './github/github.module';
import { RepositoryAnalyzerModule } from './repository-analyzer/repository-analyzer.module';
import { BotsModule } from './bots/bots.module';
import { CreditsModule } from './credits/credits.module';
import { AdsModule } from './ads/ads.module';
import { ReferralsModule } from './referrals/referrals.module';
import { PromotionsModule } from './promotions/promotions.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DomainsModule } from './domains/domains.module';
import { StorageModule } from './storage/storage.module';
import { CronModule } from './cron/cron.module';
import { WordPressModule } from './wordpress/wordpress.module';
import { HealthController } from './system/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 120 }] }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    QueueModule,

    // Phase 1 modules. Additional modules (projects, services, bots,
    // deployments, providers, domains, billing, credits, admin, ...) are
    // registered here incrementally as each phase lands, per the
    // implementation plan — this file is the single source of truth for
    // what's wired up at any point in time.
    AuthModule,
    UsersModule,
    ServicesModule,
    ProjectsModule,
    ProvidersModule,
    DeploymentsModule,
    GithubModule,
    RepositoryAnalyzerModule,
    BotsModule,
    CreditsModule,
    AdsModule,
    ReferralsModule,
    PromotionsModule,
    SubscriptionsModule,
    AdminModule,
    NotificationsModule,
    DomainsModule,
    StorageModule,
    CronModule,
    WordPressModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
