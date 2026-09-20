import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CronJobsService } from './cron-jobs.service';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';
import { CreateCronJobDto, UpdateCronJobDto } from './dto/cron.dto';

@ApiTags('cron')
@Controller('v1/cron-jobs')
export class CronJobsController {
  constructor(private readonly cronJobsService: CronJobsService) {}

  @Get()
  listMine(@CurrentUser() user: AccessTokenPayload) {
    return this.cronJobsService.listMine(user.sub);
  }

  @Post()
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateCronJobDto) {
    return this.cronJobsService.create(user.sub, dto.projectId, dto.schedule);
  }

  @Patch(':id')
  update(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string, @Body() dto: UpdateCronJobDto) {
    return this.cronJobsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string): Promise<void> {
    await this.cronJobsService.remove(user.sub, id);
  }

  @Post(':id/run-now')
  @HttpCode(HttpStatus.OK)
  runNow(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.cronJobsService.runNow(user.sub, id);
  }

  @Get(':id/executions')
  listExecutions(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.cronJobsService.listExecutions(user.sub, id);
  }
}
