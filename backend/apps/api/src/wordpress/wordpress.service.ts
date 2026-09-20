import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { EnvironmentVariablesService } from '../projects/environment-variables.service';
import { DeploymentsService } from '../deployments/deployments.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import type { InstallWordPressDto } from './dto/wordpress.dto';

@Injectable()
export class WordPressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly envVars: EnvironmentVariablesService,
    private readonly deployments: DeploymentsService,
  ) {}

  async install(ownerId: string, dto: InstallWordPressDto) {
    const service = await this.prisma.service.findUnique({ where: { slug: 'wordpress' }, include: { plans: true } });
    if (!service || !service.enabled) throw new AppError(ErrorCode.NOT_FOUND, 'WordPress hosting is not available right now.');
    const plan = service.plans.find((p) => p.isDefault) ?? service.plans[0];
    if (!plan) throw new AppError(ErrorCode.NOT_FOUND, 'No plan is configured for WordPress hosting yet.');

    const project = await this.projects.create(ownerId, { name: dto.siteName, serviceId: service.id, servicePlanId: plan.id });

    const dbPassword = randomBytes(16).toString('base64url');
    const envEntries: [string, string, boolean][] = [
      ['WORDPRESS_DB_NAME', 'wordpress', false],
      ['WORDPRESS_DB_USER', 'wordpress', false],
      ['WORDPRESS_DB_PASSWORD', dbPassword, true],
      ['WP_ADMIN_USERNAME', dto.adminUsername, false],
      ['WP_ADMIN_PASSWORD', dto.adminPassword, true],
      ['WP_ADMIN_EMAIL', dto.adminEmail, false],
      ['WP_SITE_URL', dto.domain, false],
    ];
    for (const [key, value, isSecret] of envEntries) {
      await this.envVars.create(ownerId, project.id, { key, value, isSecret });
    }

    const deployment = await this.deployments.trigger(ownerId, project.id, {
      source: { type: 'DOCKER', imageRef: 'wordpress:latest' },
    });

    return { project, deploymentId: deployment.deploymentId };
  }
}
