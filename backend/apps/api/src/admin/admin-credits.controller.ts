import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminCreditsService } from './admin-credits.service';
import { RequirePermissions } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';
import { AdjustCreditsDto } from './dto/adjust-credits.dto';

@ApiTags('admin-credits')
@Controller('v1/admin/credits')
export class AdminCreditsController {
  constructor(private readonly service: AdminCreditsService) {}

  @RequirePermissions('credits.read')
  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  @RequirePermissions('credits.adjust')
  @Post('users/:userId/adjust')
  async adjust(@CurrentUser() admin: AccessTokenPayload, @Param('userId') userId: string, @Body() dto: AdjustCreditsDto) {
    await this.service.adjust(admin.sub, admin.roles[0] ?? 'ADMIN', userId, dto.amount, dto.reason);
    return { message: 'Credits adjusted.' };
  }
}
