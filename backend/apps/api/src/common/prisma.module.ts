import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SystemSettingsService } from './system-settings.service';
import { RedisPubSubService } from './redis-pubsub.service';
import { EncryptionService } from './encryption/encryption.service';

@Global()
@Module({
  providers: [PrismaService, SystemSettingsService, RedisPubSubService, EncryptionService],
  exports: [PrismaService, SystemSettingsService, RedisPubSubService, EncryptionService],
})
export class PrismaModule {}
