import { Body, Controller, Get, Injectable, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SystemSettingsService } from '../common/system-settings.service';
import { AuditService } from '../audit/audit.service';
import { RequirePermissions } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';

export interface MaintenanceModeSettings {
  enabled: boolean;
  message?: string;
  start?: string;
  expectedEnd?: string;
}

const MAINTENANCE_KEY = 'system.maintenanceMode';

@Injectable()
export class AdminSettingsService {
  constructor(
    private readonly settings: SystemSettingsService,
    private readonly audit: AuditService,
  ) {}

  getMaintenanceMode() {
    return this.settings.get<MaintenanceModeSettings>(MAINTENANCE_KEY, { enabled: false });
  }

  async setMaintenanceMode(adminUserId: string, adminRole: string, value: MaintenanceModeSettings) {
    await this.settings.set(MAINTENANCE_KEY, value);
    await this.audit.record({
      actorUserId: adminUserId, actorRole: adminRole,
      action: value.enabled ? 'ADMIN_ENABLED_MAINTENANCE_MODE' : 'ADMIN_DISABLED_MAINTENANCE_MODE',
      targetType: 'SystemSetting', targetId: MAINTENANCE_KEY,
    });
    return value;
  }

  async getSetting(key: string) {
    return this.settings.get(key, null);
  }

  async setSetting(adminUserId: string, adminRole: string, key: string, value: unknown) {
    await this.settings.set(key, value);
    await this.audit.record({ actorUserId: adminUserId, actorRole: adminRole, action: 'ADMIN_CHANGED_SETTINGS', targetType: 'SystemSetting', targetId: key });
    return value;
  }
}

@ApiTags('admin-settings')
@Controller('v1/admin/settings')
export class AdminSettingsController {
  constructor(private readonly service: AdminSettingsService) {}

  @RequirePermissions('system.manage')
  @Get('maintenance')
  getMaintenanceMode() {
    return this.service.getMaintenanceMode();
  }

  @RequirePermissions('system.manage')
  @Put('maintenance')
  setMaintenanceMode(@CurrentUser() admin: AccessTokenPayload, @Body() value: MaintenanceModeSettings) {
    return this.service.setMaintenanceMode(admin.sub, admin.roles[0] ?? 'ADMIN', value);
  }

  @RequirePermissions('system.manage')
  @Get(':key')
  getSetting(@Param('key') key: string) {
    return this.service.getSetting(key);
  }

  @RequirePermissions('system.manage')
  @Put(':key')
  setSetting(@CurrentUser() admin: AccessTokenPayload, @Param('key') key: string, @Body('value') value: unknown) {
    return this.service.setSetting(admin.sub, admin.roles[0] ?? 'ADMIN', key, value);
  }
}
