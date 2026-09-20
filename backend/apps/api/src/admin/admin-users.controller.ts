import { Body, Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminUsersService } from './admin-users.service';
import { RequirePermissions } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('admin-users')
@Controller('v1/admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @RequirePermissions('users.read')
  @Get()
  list(@Query('search') search?: string, @Query('status') status?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.adminUsersService.list({ search, status, page: page ? Number(page) : undefined, pageSize: pageSize ? Number(pageSize) : undefined });
  }

  @RequirePermissions('users.read')
  @Get(':id')
  getDetail(@Param('id') id: string) {
    return this.adminUsersService.getDetail(id);
  }

  @RequirePermissions('users.suspend')
  @Patch(':id/status')
  async setStatus(
    @CurrentUser() admin: AccessTokenPayload,
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED',
    @Req() req: Request,
  ) {
    await this.adminUsersService.setStatus(admin.sub, admin.roles[0] ?? 'ADMIN', id, status, req.ip);
    return { message: 'User status updated.' };
  }
}
