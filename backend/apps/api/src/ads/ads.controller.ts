import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdsService } from './ads.service';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('ads')
@Controller('v1/ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get('providers')
  listProviders() {
    return this.adsService.listProviders();
  }

  @Post(':providerId/impression')
  trackImpression(@CurrentUser() user: AccessTokenPayload, @Param('providerId') providerId: string) {
    return this.adsService.trackImpression(user.sub, providerId);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':providerId/complete')
  complete(@CurrentUser() user: AccessTokenPayload, @Param('providerId') providerId: string, @Body('token') token?: string) {
    return this.adsService.completeAd(user.sub, providerId, token);
  }
}
