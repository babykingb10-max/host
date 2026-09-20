import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../common/constants/env.schema';
import { PrismaModule } from '../common/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { ProvidersModule } from '../providers/providers.module';
import { DeploymentEventsService } from '../deployments/deployment-events.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DeploymentProcessor } from './deployment.processor';
import { CronProcessor } from './cron.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    QueueModule,
    ProvidersModule,
  ],
  providers: [DeploymentEventsService, NotificationsService, DeploymentProcessor, CronProcessor],
})
export class WorkerModule {}
