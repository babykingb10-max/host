import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('promotions')
@Controller('v1/promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.promotionsService.listActive(user.sub);
  }

  @Post(':id/claim')
  claim(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.promotionsService.claim(user.sub, id);
  }
}
