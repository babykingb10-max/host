import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminProvidersService } from './admin-providers.service';
import { RequirePermissions } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';
import type { ProviderKey } from '@prisma/client';

@ApiTags('admin-providers')
@Controller('v1/admin/providers')
export class AdminProvidersController {
  constructor(private readonly service: AdminProvidersService) {}

  @RequirePermissions('providers.read')
  @Get()
  list() {
    return this.service.list();
  }

  @RequirePermissions('providers.manage')
  @Post(':key/enable')
  async enable(@CurrentUser() admin: AccessTokenPayload, @Param('key') key: ProviderKey) {
    await this.service.setEnabled(admin.sub, admin.roles[0] ?? 'ADMIN', key, true);
    return { message: 'Provider enabled.' };
  }

  @RequirePermissions('providers.manage')
  @Post(':key/disable')
  async disable(@CurrentUser() admin: AccessTokenPayload, @Param('key') key: ProviderKey) {
    await this.service.setEnabled(admin.sub, admin.roles[0] ?? 'ADMIN', key, false);
    return { message: 'Provider disabled.' };
  }

  @RequirePermissions('providers.manage')
  @Post(':key/credentials')
  async setCredentials(@CurrentUser() admin: AccessTokenPayload, @Param('key') key: ProviderKey, @Body() credentials: Record<string, unknown>) {
    await this.service.setCredentials(admin.sub, admin.roles[0] ?? 'ADMIN', key, credentials);
    return { message: 'Credentials saved.' };
  }

  @RequirePermissions('providers.read')
  @Post(':key/test')
  testConnection(@Param('key') key: ProviderKey) {
    return this.service.testConnection(key);
  }
}
