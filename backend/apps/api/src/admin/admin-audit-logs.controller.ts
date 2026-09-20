import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditService } from '../audit/audit.service';
import { RequirePermissions } from '../common/guards/permissions.guard';

@ApiTags('admin-audit-logs')
@Controller('v1/admin/audit-logs')
export class AdminAuditLogsController {
  constructor(private readonly audit: AuditService) {}

  @RequirePermissions('audit.read')
  @Get()
  list(
    @Query('actorUserId') actorUserId?: string,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
    @Query('page') page?: string,
  ) {
    return this.audit.list({ actorUserId, action, targetType, page: page ? Number(page) : undefined });
  }
}
