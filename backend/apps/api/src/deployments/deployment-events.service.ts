import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RedisPubSubService } from '../common/redis-pubsub.service';
import type { DeploymentEventType, DeploymentStatus } from '@prisma/client';

export interface DeploymentEventPayload {
  deploymentId: string;
  type: DeploymentEventType;
  step?: DeploymentStatus;
  message: string;
  createdAt: string;
}

function channelFor(deploymentId: string): string {
  return `deployment:${deploymentId}:events`;
}

@Injectable()
export class DeploymentEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: RedisPubSubService,
  ) {}

  async emit(deploymentId: string, type: DeploymentEventType, message: string, step?: DeploymentStatus): Promise<void> {
    const event = await this.prisma.deploymentEvent.create({
      data: { deploymentId, type, message, step },
    });

    const payload: DeploymentEventPayload = {
      deploymentId,
      type: event.type,
      step: event.step ?? undefined,
      message: event.message,
      createdAt: event.createdAt.toISOString(),
    };
    await this.pubsub.publish(channelFor(deploymentId), payload);
  }

  async history(deploymentId: string): Promise<DeploymentEventPayload[]> {
    const events = await this.prisma.deploymentEvent.findMany({
      where: { deploymentId },
      orderBy: { createdAt: 'asc' },
    });
    return events.map((e) => ({
      deploymentId,
      type: e.type,
      step: e.step ?? undefined,
      message: e.message,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  /** Live subscription for the SSE stream. Returns an unsubscribe function. */
  subscribe(deploymentId: string, handler: (event: DeploymentEventPayload) => void): Promise<() => Promise<void>> {
    return this.pubsub.subscribe(channelFor(deploymentId), (raw) => handler(JSON.parse(raw) as DeploymentEventPayload));
  }
}
