import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PairingService } from './pairing.service';
import { CurrentUser } from '../../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../../auth/strategies/jwt.strategy';
import { RequestPairingDto, SubmitManualSessionDto } from './dto/pairing.dto';

@ApiTags('pairing')
@Controller('v1/projects/:projectId/pairing')
export class PairingController {
  constructor(private readonly pairing: PairingService) {}

  @Post('request')
  request(@CurrentUser() user: AccessTokenPayload, @Param('projectId') projectId: string, @Body() dto: RequestPairingDto) {
    return this.pairing.requestPairing(user.sub, projectId, dto.phoneNumber);
  }

  @Get('status')
  status(@CurrentUser() user: AccessTokenPayload, @Param('projectId') projectId: string) {
    return this.pairing.getStatus(user.sub, projectId);
  }

  @Post('manual-session')
  @HttpCode(HttpStatus.OK)
  async submitManualSession(@CurrentUser() user: AccessTokenPayload, @Param('projectId') projectId: string, @Body() dto: SubmitManualSessionDto) {
    await this.pairing.submitManualSession(user.sub, projectId, dto.sessionId);
    return { message: 'Session saved.' };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(@CurrentUser() user: AccessTokenPayload, @Param('projectId') projectId: string): Promise<void> {
    await this.pairing.cancel(user.sub, projectId);
  }
}
