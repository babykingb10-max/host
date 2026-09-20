import { BadRequestException, Controller, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { PrismaService } from '../common/prisma.service';
import { DeploymentsService } from '../deployments/deployments.service';
import { Public } from '../common/guards/jwt-auth.guard';

interface GithubPushPayload {
  ref: string;
  repository: { name: string; owner: { login: string } };
}

@ApiExcludeController()
@Public()
@Controller('v1/webhooks/github')
export class GithubWebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly deployments: DeploymentsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Req() req: Request,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Headers('x-github-delivery') deliveryId: string | undefined,
    @Headers('x-github-event') eventType: string | undefined,
  ) {
    const secret = this.config.get<string>('GITHUB_WEBHOOK_SECRET');
    if (!secret) return { received: false, reason: 'not_configured' };
    if (!deliveryId || !eventType) throw new BadRequestException('Missing GitHub webhook headers.');

    this.verifySignature(req.rawBody, signature, secret);

    // Idempotency: GitHub retries deliveries — a unique delivery ID we've
    // already recorded means "already handled", not an error.
    try {
      await this.prisma.githubWebhookDelivery.create({ data: { deliveryId, eventType } });
    } catch {
      return { received: true, deduped: true };
    }

    if (eventType !== 'push') return { received: true, skipped: 'unsupported_event' };

    const payload = JSON.parse(req.rawBody?.toString('utf8') ?? '{}') as GithubPushPayload;
    const branch = payload.ref?.replace('refs/heads/', '');
    if (!branch) return { received: true, skipped: 'not_a_branch_push' };

    const link = await this.prisma.githubRepositoryLink.findFirst({
      where: {
        ownerLogin: payload.repository.owner.login,
        repoName: payload.repository.name,
        branch,
        autoDeployEnabled: true,
      },
    });
    if (!link) return { received: true, skipped: 'no_matching_project' };

    const result = await this.deployments.triggerFromWebhook(link.projectId);
    return { received: true, deploymentId: result?.deploymentId ?? null };
  }

  private verifySignature(rawBody: Buffer | undefined, signature: string | undefined, secret: string): void {
    if (!rawBody || !signature) throw new BadRequestException('Missing webhook signature.');
    const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new BadRequestException('Invalid webhook signature.');
    }
  }
}
