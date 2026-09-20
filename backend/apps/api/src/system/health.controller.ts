import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { Public } from '../common/guards/jwt-auth.guard';

@ApiTags('system')
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('deployment') private readonly deploymentQueue: Queue,
  ) {}

  /** Liveness: is the process itself up? Never checks dependencies. */
  @Public()
  @Get('live')
  @HttpCode(HttpStatus.OK)
  live() {
    return { status: 'ok' };
  }

  /** Readiness: can this instance actually serve traffic (DB + queue reachable)? */
  @Public()
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async ready() {
    const checks: Record<string, boolean> = { database: false, queue: false };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }

    try {
      await this.deploymentQueue.client;
      checks.queue = true;
    } catch {
      checks.queue = false;
    }

    const healthy = Object.values(checks).every(Boolean);
    if (!healthy) throw new ServiceUnavailableException({ status: 'unhealthy', checks });
    return { status: 'ok', checks };
  }

  @Public()
  @Get('health')
  @HttpCode(HttpStatus.OK)
  health() {
    return this.ready();
  }
}
