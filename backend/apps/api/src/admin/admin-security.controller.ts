import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SecurityService } from '../security/security.service';
import { RequirePermissions } from '../common/guards/permissions.guard';
import type { SecuritySeverity } from '@prisma/client';

@ApiTags('admin-security')
@Controller('v1/admin/security')
export class AdminSecurityController {
  constructor(private readonly security: SecurityService) {}

  @RequirePermissions('security.manage')
  @Get('events')
  list(@Query('severity') severity?: SecuritySeverity, @Query('resolved') resolved?: string, @Query('page') page?: string) {
    return this.security.list({
      severity,
      resolved: resolved === undefined ? undefined : resolved === 'true',
      page: page ? Number(page) : undefined,
    });
  }

  @RequirePermissions('security.manage')
  @Patch('events/:id/resolve')
  async resolve(@Param('id') id: string) {
    await this.security.resolve(id);
    return { message: 'Marked as resolved.' };
  }
}
