import { Module } from '@nestjs/common';
import { RepositoryAnalyzerController } from './repository-analyzer.controller';
import { RepositoryAnalyzerService } from './repository-analyzer.service';
import { GithubModule } from '../github/github.module';

@Module({
  imports: [GithubModule],
  controllers: [RepositoryAnalyzerController],
  providers: [RepositoryAnalyzerService],
})
export class RepositoryAnalyzerModule {}
