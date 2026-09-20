import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { Public } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';
import { SubscribeDto } from './dto/subscriptions.dto';

@ApiTags('subscriptions')
@Controller('v1/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('plans')
  listPlans() {
    return this.subscriptionsService.listPlans();
  }

  @Get('me')
  getMine(@CurrentUser() user: AccessTokenPayload) {
    return this.subscriptionsService.getMine(user.sub);
  }

  @Post('subscribe')
  subscribe(@CurrentUser() user: AccessTokenPayload, @Body() dto: SubscribeDto) {
    return this.subscriptionsService.subscribe(user.sub, dto.tier);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(@CurrentUser() user: AccessTokenPayload): Promise<void> {
    await this.subscriptionsService.cancel(user.sub);
  }
}
