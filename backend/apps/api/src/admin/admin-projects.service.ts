import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { DeploymentsService } from '../deployments/deployments.service';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

@Injectable()
export class AdminProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ProviderRegistryService,
    private readonly deployments: DeploymentsService,
    private readonly audit: AuditService,
  ) {}

  async list(params: { search?: string; status?: string; serviceSlug?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));

    const where = {
      deletedAt: null,
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.serviceSlug ? { service: { slug: params.serviceSlug } } : {}),
      ...(params.search ? { name: { contains: params.search, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
        include: { owner: { select: { username: true, email: true } }, service: { select: { name: true, slug: true } } },
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async getDetail(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { owner: { select: { username: true, email: true } }, service: true, servicePlan: true, deployments: { orderBy: { startedAt: 'desc' }, take: 10 } },
    });
    if (!project) throw new AppError(ErrorCode.NOT_FOUND);
    return project;
  }

  async restart(adminUserId: string, adminRole: string, projectId: string): Promise<void> {
    await this.performProviderAction(projectId, 'restart');
    await this.audit.record({ actorUserId: adminUserId, actorRole: adminRole, action: 'ADMIN_RESTARTED_PROJECT', targetType: 'Project', targetId: projectId });
  }

  async stop(adminUserId: string, adminRole: string, projectId: string): Promise<void> {
    await this.performProviderAction(projectId, 'stop');
    await this.prisma.project.update({ where: { id: projectId }, data: { status: 'STOPPED' } });
    await this.audit.record({ actorUserId: adminUserId, actorRole: adminRole, action: 'ADMIN_STOPPED_PROJECT', targetType: 'Project', targetId: projectId });
  }

  async suspend(adminUserId: string, adminRole: string, projectId: string): Promise<void> {
    await this.performProviderAction(projectId, 'stop').catch(() => undefined); // best-effort — suspension still applies even if provider is unreachable
    await this.prisma.project.update({ where: { id: projectId }, data: { status: 'SUSPENDED' } });
    await this.audit.record({ actorUserId: adminUserId, actorRole: adminRole, action: 'ADMIN_SUSPENDED_PROJECT', targetType: 'Project', targetId: projectId });
  }

  async resume(adminUserId: string, adminRole: string, projectId: string): Promise<void> {
    await this.performProviderAction(projectId, 'start');
    await this.prisma.project.update({ where: { id: projectId }, data: { status: 'RUNNING' } });
    await this.audit.record({ actorUserId: adminUserId, actorRole: adminRole, action: 'ADMIN_RESUMED_PROJECT', targetType: 'Project', targetId: projectId });
  }

  async retryDeployment(adminUserId: string, adminRole: string, projectId: string) {
    const result = await this.deployments.triggerFromWebhook(projectId);
    await this.audit.record({ actorUserId: adminUserId, actorRole: adminRole, action: 'ADMIN_RETRIED_DEPLOYMENT', targetType: 'Project', targetId: projectId, metadata: { deploymentId: result?.deploymentId } });
    return result;
  }

  async remove(adminUserId: string, adminRole: string, projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError(ErrorCode.NOT_FOUND);
    if (project.providerId && project.providerResourceId) {
      await this.registry.get(project.providerId).delete(project.providerResourceId).catch(() => undefined);
    }
    await this.prisma.project.update({ where: { id: projectId }, data: { status: 'DELETING', deletedAt: new Date() } });
    await this.audit.record({ actorUserId: adminUserId, actorRole: adminRole, action: 'ADMIN_DELETED_PROJECT', targetType: 'Project', targetId: projectId });
  }

  private async performProviderAction(projectId: string, action: 'start' | 'stop' | 'restart'): Promise<void> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError(ErrorCode.NOT_FOUND);
    if (!project.providerId || !project.providerResourceId) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, 'This project has not been deployed yet.');
    }
    const adapter = this.registry.get(project.providerId);
    await adapter[action](project.providerResourceId);
  }
}
