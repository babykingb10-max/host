import { Injectable, Logger } from '@nestjs/common';
import { promises as dns } from 'dns';
import { randomBytes } from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

const VERIFICATION_SUBDOMAIN = '_adevos-verify';

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async listMine(ownerId: string) {
    const domains = await this.prisma.domain.findMany({
      where: { project: { ownerId } },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return domains.map(this.toPublic);
  }

  async add(ownerId: string, projectId: string, domainName: string) {
    await this.requireOwnedProject(ownerId, projectId);

    const existing = await this.prisma.domain.findUnique({ where: { domainName: domainName.toLowerCase() } });
    if (existing) throw new AppError(ErrorCode.VALIDATION_FAILED, 'This domain is already connected to a project.');

    const domain = await this.prisma.domain.create({
      data: {
        projectId,
        domainName: domainName.toLowerCase(),
        verificationToken: randomBytes(16).toString('hex'),
        status: 'PENDING',
      },
    });
    return this.toPublic(domain);
  }

  async verify(ownerId: string, domainId: string) {
    const domain = await this.requireOwnedDomain(ownerId, domainId);
    await this.prisma.domain.update({ where: { id: domainId }, data: { status: 'VERIFYING', lastCheckedAt: new Date() } });

    const recordHost = `${VERIFICATION_SUBDOMAIN}.${domain.domainName}`;
    let found = false;
    try {
      const records = await dns.resolveTxt(recordHost);
      found = records.some((chunks) => chunks.join('').includes(domain.verificationToken));
    } catch (err) {
      this.logger.debug(`DNS TXT lookup failed for ${recordHost}: ${err}`);
      found = false;
    }

    if (!found) {
      const updated = await this.prisma.domain.update({
        where: { id: domainId },
        data: { status: 'FAILED', failureReason: `No matching TXT record found at ${recordHost}.` },
      });
      throw new AppError(ErrorCode.DOMAIN_VERIFICATION_FAILED, `We couldn't find the verification TXT record at ${recordHost} yet. DNS changes can take a few minutes to propagate.`, { domain: this.toPublic(updated) });
    }

    const updated = await this.prisma.domain.update({
      where: { id: domainId },
      data: { status: 'CONNECTED', verifiedAt: new Date(), sslStatus: 'PENDING', failureReason: null },
    });

    const project = await this.prisma.project.findUnique({ where: { id: domain.projectId } });
    if (project) {
      await this.notifications.notify(project.ownerId, 'DOMAIN_VERIFIED', 'Domain connected', `${domain.domainName} is now connected to ${project.name}.`, { domainId }).catch(() => undefined);
    }

    return this.toPublic(updated);
  }

  async remove(ownerId: string, domainId: string): Promise<void> {
    await this.requireOwnedDomain(ownerId, domainId);
    await this.prisma.domain.delete({ where: { id: domainId } });
  }

  private async requireOwnedProject(ownerId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.deletedAt || project.ownerId !== ownerId) throw new AppError(ErrorCode.PROJECT_NOT_FOUND);
    return project;
  }

  private async requireOwnedDomain(ownerId: string, domainId: string) {
    const domain = await this.prisma.domain.findUnique({ where: { id: domainId }, include: { project: true } });
    if (!domain || domain.project.ownerId !== ownerId) throw new AppError(ErrorCode.NOT_FOUND);
    return domain;
  }

  private toPublic(domain: {
    id: string; domainName: string; status: string; verificationToken: string;
    verifiedAt: Date | null; sslStatus: string; failureReason: string | null; createdAt: Date;
    project?: { id: string; name: string };
  }) {
    return {
      id: domain.id,
      domainName: domain.domainName,
      status: domain.status,
      sslStatus: domain.sslStatus,
      verifiedAt: domain.verifiedAt,
      failureReason: domain.failureReason,
      createdAt: domain.createdAt,
      project: domain.project,
      dnsInstructions: {
        type: 'TXT',
        name: `${VERIFICATION_SUBDOMAIN}.${domain.domainName}`,
        value: domain.verificationToken,
      },
    };
  }
}
