import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { EnvironmentVariablesService } from './environment-variables.service';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';
import { BulkImportEnvDto, CreateEnvVarDto, UpdateEnvVarDto } from './dto/environment.dto';

@ApiTags('environment-variables')
@Controller('v1/projects/:projectId/environment')
export class EnvironmentVariablesController {
  constructor(private readonly envService: EnvironmentVariablesService) {}

  @Get()
  list(@CurrentUser() user: AccessTokenPayload, @Param('projectId') projectId: string) {
    return this.envService.list(user.sub, projectId);
  }

  // Reveal is rate-limited — it's the one endpoint that returns a
  // decrypted secret value (spec §35: masked by default).
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get(':varId/reveal')
  reveal(@CurrentUser() user: AccessTokenPayload, @Param('projectId') projectId: string, @Param('varId') varId: string) {
    return this.envService.reveal(user.sub, projectId, varId);
  }

  @Post()
  create(@CurrentUser() user: AccessTokenPayload, @Param('projectId') projectId: string, @Body() dto: CreateEnvVarDto) {
    return this.envService.create(user.sub, projectId, dto);
  }

  @Post('bulk-import')
  bulkImport(@CurrentUser() user: AccessTokenPayload, @Param('projectId') projectId: string, @Body() dto: BulkImportEnvDto) {
    return this.envService.bulkImport(user.sub, projectId, dto.content);
  }

  @Patch(':varId')
  update(@CurrentUser() user: AccessTokenPayload, @Param('projectId') projectId: string, @Param('varId') varId: string, @Body() dto: UpdateEnvVarDto) {
    return this.envService.update(user.sub, projectId, varId, dto);
  }

  @Delete(':varId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AccessTokenPayload, @Param('projectId') projectId: string, @Param('varId') varId: string): Promise<void> {
    await this.envService.remove(user.sub, projectId, varId);
  }
}
