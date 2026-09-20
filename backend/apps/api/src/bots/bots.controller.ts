import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BotsService } from './bots.service';
import { Public } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';
import { SubmitBotDto } from './dto/submit-bot.dto';

@ApiTags('bots')
@Controller('v1/bots')
export class BotsController {
  constructor(private readonly botsService: BotsService) {}

  @Public()
  @Get()
  list(@Query('category') category?: string) {
    return this.botsService.listCatalog(category);
  }

  @Get('submissions/mine')
  listMine(@CurrentUser() user: AccessTokenPayload) {
    return this.botsService.listMySubmissions(user.sub);
  }

  @Post('submit')
  submit(@CurrentUser() user: AccessTokenPayload, @Body() dto: SubmitBotDto) {
    return this.botsService.submit(user.sub, dto);
  }

  @Public()
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.botsService.getById(id);
  }
}
