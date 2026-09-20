import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreditsService } from './credits.service';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('credits')
@Controller('v1/credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get()
  getWallet(@CurrentUser() user: AccessTokenPayload) {
    return this.creditsService.getWallet(user.sub);
  }

  @Get('transactions')
  listTransactions(@CurrentUser() user: AccessTokenPayload, @Query('filter') filter?: 'earned' | 'spent') {
    return this.creditsService.listTransactions(user.sub, filter);
  }

  @Post('daily-checkin')
  claimDailyCheckin(@CurrentUser() user: AccessTokenPayload) {
    return this.creditsService.claimDailyCheckin(user.sub);
  }
}
