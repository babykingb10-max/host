import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RepositoryAnalyzerService } from './repository-analyzer.service';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';
import { AnalyzeRepositoryDto } from './dto/repository-analyzer.dto';

@ApiTags('repository-analyzer')
@Controller('v1/repository-analyzer')
export class RepositoryAnalyzerController {
  constructor(private readonly analyzer: RepositoryAnalyzerService) {}

  @Post('analyze')
  analyze(@CurrentUser() user: AccessTokenPayload, @Body() dto: AnalyzeRepositoryDto) {
    return this.analyzer.analyze(user.sub, dto.owner, dto.repo, dto.branch);
  }
}
