import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequirePermissions } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class AdminFeatureFlagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }

  async setEnabled(adminUserId: string, adminRole: string, key: string, enabled: boolean) {
    const flag = await this.prisma.featureFlag.update({ where: { key }, data: { enabled } });
    await this.audit.record({
      actorUserId: adminUserId, actorRole: adminRole,
      action: enabled ? 'ADMIN_ENABLED_FEATURE_FLAG' : 'ADMIN_DISABLED_FEATURE_FLAG',
      targetType: 'FeatureFlag', targetId: key,
    });
    return flag;
  }
}

@ApiTags('admin-feature-flags')
@Controller('v1/admin/feature-flags')
export class AdminFeatureFlagsController {
  constructor(private readonly service: AdminFeatureFlagsService) {}

  @RequirePermissions('system.manage')
  @Get()
  list() {
    return this.service.list();
  }

  @RequirePermissions('system.manage')
  @Patch(':key')
  setEnabled(@CurrentUser() admin: AccessTokenPayload, @Param('key') key: string, @Body('enabled') enabled: boolean) {
    return this.service.setEnabled(admin.sub, admin.roles[0] ?? 'ADMIN', key, enabled);
  }
}
