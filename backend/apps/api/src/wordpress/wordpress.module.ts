import { Module } from '@nestjs/common';
import { WordPressController } from './wordpress.controller';
import { WordPressService } from './wordpress.service';
import { ProjectsModule } from '../projects/projects.module';
import { DeploymentsModule } from '../deployments/deployments.module';

@Module({
  imports: [ProjectsModule, DeploymentsModule],
  controllers: [WordPressController],
  providers: [WordPressService],
})
export class WordPressModule {}
