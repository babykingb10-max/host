import { Module } from '@nestjs/common';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';
import { DeploymentEventsService } from './deployment-events.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule],
  controllers: [DeploymentsController],
  providers: [DeploymentsService, DeploymentEventsService],
  exports: [DeploymentEventsService, DeploymentsService],
})
export class DeploymentsModule {}
