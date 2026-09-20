import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { EnvironmentVariablesController } from './environment-variables.controller';
import { EnvironmentVariablesService } from './environment-variables.service';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { ServicesModule } from '../services/services.module';
import { ProvidersModule } from '../providers/providers.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [ServicesModule, ProvidersModule, SubscriptionsModule],
  controllers: [ProjectsController, EnvironmentVariablesController, LogsController],
  providers: [ProjectsService, EnvironmentVariablesService, LogsService],
  exports: [ProjectsService, EnvironmentVariablesService],
})
export class ProjectsModule {}
