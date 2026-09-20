import { Body, Controller, Headers, HttpCode, HttpStatus, Param, Post, UnauthorizedException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PairingService } from './pairing.service';
import { Public } from '../../common/guards/jwt-auth.guard';
import { PairingCallbackDto } from './dto/pairing.dto';

/**
 * The bot container POSTs here using the PAIRING_CALLBACK_URL /
 * PAIRING_CALLBACK_TOKEN env vars injected at deploy time (see
 * PairingService.injectCallbackEnvVars) — token travels as a header,
 * matching how those two env vars are handed to the container
 * separately rather than baked into one URL.
 */
@ApiExcludeController()
@Public()
@Controller('v1/pairing/callback')
export class PairingCallbackController {
  constructor(private readonly pairing: PairingService) {}

  @Post(':sessionId')
  @HttpCode(HttpStatus.OK)
  async callback(
    @Param('sessionId') sessionId: string,
    @Headers('x-callback-token') token: string | undefined,
    @Body() dto: PairingCallbackDto,
  ) {
    if (!token) throw new UnauthorizedException();
    await this.pairing.handleCallback(sessionId, token, dto);
    return { received: true };
  }
}
