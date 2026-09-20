import { Module } from '@nestjs/common';
import { BotsController } from './bots.controller';
import { BotsService } from './bots.service';
import { PairingController } from './pairing/pairing.controller';
import { PairingCallbackController } from './pairing/pairing-callback.controller';
import { PairingService } from './pairing/pairing.service';
import { HttpPairingAdapter } from './pairing/http-pairing.adapter';

@Module({
  controllers: [BotsController, PairingController, PairingCallbackController],
  providers: [BotsService, PairingService, HttpPairingAdapter],
})
export class BotsModule {}
