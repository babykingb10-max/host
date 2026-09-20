import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { SystemSettingsService } from '../common/system-settings.service';
import { ServicesService } from '../services/services.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { slugify } from '../common/utils/slugify';
import type { CreateProjectDto, ListProjectsQueryDto, RenameProjectDto } from './dto/projects.dto';

const DEFAULT_MAX_PROJECTS_PER_USER = 3; // fallback only — real value is DB-driven via SystemSettingsService, editable from Admin > Settings (Phase 9)
const SETTING_KEY_MAX_PROJECTS = 'projects.maxPerUser.free';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SystemSettingsService,
    private readonly services: ServicesService,
    private readonly subscriptions: SubscriptionsService,
    private readonly encryption: EncryptionService,
  ) {}

  async create(ownerId: string, dto: CreateProjectDto) {
    const { service, plan } = await this.services.requireEnabledServiceWithPlan(dto.serviceId, dto.servicePlanId);

    const freeDefault = await this.settings.get<number>(SETTING_KEY_MAX_PROJECTS, DEFAULT_MAX_PROJECTS_PER_USER);
    const maxProjects = await this.subscriptions.getEffectiveMaxProjects(ownerId, freeDefault);
    const currentCount = await this.prisma.project.count({ where: { ownerId, deletedAt: null } });
    if (currentCount >= maxProjects) {
      throw new AppError(ErrorCode.PROJECT_QUOTA_EXCEEDED);
    }

    const baseSlug = slugify(dto.name);
    const slug = await this.uniqueSlugForOwner(ownerId, baseSlug);

    const project = await this.prisma.project.create({
      data: {
        ownerId,
        name: dto.name,
        slug,
        serviceId: service.id,
        servicePlanId: plan.id,
        status: 'CREATING',
      },
    });

    if (service.category === 'database') {
      await this.provisionDatabaseCredentials(project.id, service.slug);
    }

    // NOTE: this only creates the project record. Source selection,
    // repository analysis, and the actual deployment job are handled
    // by the Deployment Wizard + Deployment Engine, landing in Phase 4/5.
    return this.toPublicProject(project);
  }

  /**
   * Generates real random credentials and stores them the same way any
   * other secret is stored — as encrypted ProjectEnvironmentVariable
   * rows — reusing the existing masked/reveal UI rather than building a
   * parallel database-credentials system (spec §24, §29).
   */
  private async provisionDatabaseCredentials(projectId: string, serviceSlug: string): Promise<void> {
    const username = `adevos_${randomBytes(4).toString('hex')}`;
    const password = randomBytes(18).toString('base64url');
    const dbName = `db_${randomBytes(4).toString('hex')}`;

    const enginePort: Record<string, number> = { postgresql: 5432, mysql: 3306, mongodb: 27017, redis: 6379 };
    const port = enginePort[serviceSlug] ?? 5432;
    const scheme: Record<string, string> = { postgresql: 'postgresql', mysql: 'mysql', mongodb: 'mongodb', redis: 'redis' };
    const host = `${projectId.slice(0, 8)}.db.internal.adevos-x.example`; // resolved to the real provisioned host once the provider adapter's createResource() returns one

    const connectionString =
      serviceSlug === 'redis'
        ? `redis://:${password}@${host}:${port}`
        : `${scheme[serviceSlug] ?? 'postgresql'}://${username}:${password}@${host}:${port}/${dbName}`;

    const vars: [string, string, boolean][] = [
      ['DB_HOST', host, false],
      ['DB_PORT', String(port), false],
      ['DB_NAME', dbName, false],
      ['DB_USERNAME', username, true],
      ['DB_PASSWORD', password, true],
      ['DATABASE_URL', connectionString, true],
    ];

    for (const [key, value, isSecret] of vars) {
      await this.prisma.projectEnvironmentVariable.create({
        data: { projectId, key, valueEncrypted: this.encryption.encrypt(value), isSecret },
      });
    }
  }

  async listMine(ownerId: string, query: ListProjectsQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

    const where = {
      ownerId,
      deletedAt: null,
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
      ...(query.serviceSlug ? { service: { slug: query.serviceSlug } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: { service: { select: { slug: true, name: true, icon: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      items: items.map(this.toPublicProject),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getById(ownerId: string, projectId: string) {
    const project = await this.requireOwnedProject(ownerId, projectId);
    return this.toPublicProject(project);
  }

  async rename(ownerId: string, projectId: string, dto: RenameProjectDto) {
    await this.requireOwnedProject(ownerId, projectId);
    const updated = await this.prisma.project.update({ where: { id: projectId }, data: { name: dto.name } });
    return this.toPublicProject(updated);
  }

  async softDelete(ownerId: string, projectId: string): Promise<void> {
    const project = await this.requireOwnedProject(ownerId, projectId);
    // Actual teardown (provider resource deletion) is queued through the
    // deployment engine's "delete" queue (Phase 4) — this only marks the
    // platform record as deleting; a worker completes the transition to DELETED.
    await this.prisma.project.update({ where: { id: project.id }, data: { status: 'DELETING', deletedAt: new Date() } });
  }

  // -- internals -------------------------------------------------------

  private async requireOwnedProject(ownerId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { service: { select: { slug: true, name: true, icon: true } } },
    });
    // Same NOT_FOUND for "doesn't exist" and "not yours" — never leak
    // existence of another user's resource (prevents IDOR enumeration).
    if (!project || project.deletedAt || project.ownerId !== ownerId) {
      throw new AppError(ErrorCode.PROJECT_NOT_FOUND);
    }
    return project;
  }

  private async uniqueSlugForOwner(ownerId: string, baseSlug: string): Promise<string> {
    let candidate = baseSlug;
    let suffix = 1;
    // Small bounded loop — project counts per user are capped by quota anyway.
    while (await this.prisma.project.findUnique({ where: { ownerId_slug: { ownerId, slug: candidate } } })) {
      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }
    return candidate;
  }

  private toPublicProject(project: {
    id: string; name: string; slug: string; status: string;
    providerResourceId: string | null; region: string | null; runtime: string | null;
    capabilities: unknown; source: unknown; createdAt: Date; updatedAt: Date;
    service?: { slug: string; name: string; icon: string };
  }) {
    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      status: project.status,
      region: project.region,
      runtime: project.runtime,
      capabilities: project.capabilities,
      source: project.source,
      service: project.service,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
