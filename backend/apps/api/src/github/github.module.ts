import { Module } from '@nestjs/common';
import { GithubController } from './github.controller';
import { GithubWebhookController } from './github-webhook.controller';
import { GithubService } from './github.service';
import { DeploymentsModule } from '../deployments/deployments.module';

@Module({
  imports: [DeploymentsModule],
  controllers: [GithubController, GithubWebhookController],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}
