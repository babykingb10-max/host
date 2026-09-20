import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminProjectsService } from './admin-projects.service';
import { RequirePermissions } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('admin-projects')
@Controller('v1/admin/projects')
export class AdminProjectsController {
  constructor(private readonly adminProjectsService: AdminProjectsService) {}

  @RequirePermissions('projects.read')
  @Get()
  list(@Query('search') search?: string, @Query('status') status?: string, @Query('serviceSlug') serviceSlug?: string, @Query('page') page?: string) {
    return this.adminProjectsService.list({ search, status, serviceSlug, page: page ? Number(page) : undefined });
  }

  @RequirePermissions('projects.read')
  @Get(':id')
  getDetail(@Param('id') id: string) {
    return this.adminProjectsService.getDetail(id);
  }

  @RequirePermissions('projects.restart')
  @Post(':id/restart')
  @HttpCode(HttpStatus.OK)
  async restart(@CurrentUser() admin: AccessTokenPayload, @Param('id') id: string) {
    await this.adminProjectsService.restart(admin.sub, admin.roles[0] ?? 'ADMIN', id);
    return { message: 'Restart requested.' };
  }

  @RequirePermissions('projects.stop')
  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  async stop(@CurrentUser() admin: AccessTokenPayload, @Param('id') id: string) {
    await this.adminProjectsService.stop(admin.sub, admin.roles[0] ?? 'ADMIN', id);
    return { message: 'Stop requested.' };
  }

  @RequirePermissions('projects.suspend')
  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspend(@CurrentUser() admin: AccessTokenPayload, @Param('id') id: string) {
    await this.adminProjectsService.suspend(admin.sub, admin.roles[0] ?? 'ADMIN', id);
    return { message: 'Project suspended.' };
  }

  @RequirePermissions('projects.suspend')
  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  async resume(@CurrentUser() admin: AccessTokenPayload, @Param('id') id: string) {
    await this.adminProjectsService.resume(admin.sub, admin.roles[0] ?? 'ADMIN', id);
    return { message: 'Project resumed.' };
  }

  @RequirePermissions('deployments.retry')
  @Post(':id/retry-deployment')
  @HttpCode(HttpStatus.OK)
  retryDeployment(@CurrentUser() admin: AccessTokenPayload, @Param('id') id: string) {
    return this.adminProjectsService.retryDeployment(admin.sub, admin.roles[0] ?? 'ADMIN', id);
  }

  @RequirePermissions('projects.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() admin: AccessTokenPayload, @Param('id') id: string): Promise<void> {
    await this.adminProjectsService.remove(admin.sub, admin.roles[0] ?? 'ADMIN', id);
  }
}
