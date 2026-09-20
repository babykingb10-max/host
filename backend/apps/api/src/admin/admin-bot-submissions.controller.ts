import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminBotSubmissionsService } from './admin-bot-submissions.service';
import { RequirePermissions } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';
import type { BotSubmissionStatus } from '@prisma/client';

@ApiTags('admin-bot-submissions')
@Controller('v1/admin/bot-submissions')
export class AdminBotSubmissionsController {
  constructor(private readonly service: AdminBotSubmissionsService) {}

  @RequirePermissions('bots.approve')
  @Get()
  list(@Query('status') status?: BotSubmissionStatus) {
    return this.service.list(status);
  }

  @RequirePermissions('bots.approve')
  @Get(':id')
  getDetail(@Param('id') id: string) {
    return this.service.getDetail(id);
  }

  @RequirePermissions('bots.approve')
  @Post(':id/approve')
  approve(@CurrentUser() admin: AccessTokenPayload, @Param('id') id: string, @Body('reviewNotes') reviewNotes?: string) {
    return this.service.approve(admin.sub, admin.roles[0] ?? 'ADMIN', id, reviewNotes);
  }

  @RequirePermissions('bots.approve')
  @Post(':id/reject')
  async reject(@CurrentUser() admin: AccessTokenPayload, @Param('id') id: string, @Body('reviewNotes') reviewNotes: string) {
    await this.service.reject(admin.sub, admin.roles[0] ?? 'ADMIN', id, reviewNotes);
    return { message: 'Submission rejected.' };
  }

  @RequirePermissions('bots.approve')
  @Post(':id/request-changes')
  async requestChanges(@CurrentUser() admin: AccessTokenPayload, @Param('id') id: string, @Body('reviewNotes') reviewNotes: string) {
    await this.service.requestChanges(admin.sub, admin.roles[0] ?? 'ADMIN', id, reviewNotes);
    return { message: 'Changes requested.' };
  }
}
