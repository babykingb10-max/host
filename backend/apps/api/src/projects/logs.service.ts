import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../common/prisma.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

const POLL_INTERVAL_MS = 4000;

@Injectable()
export class LogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ProviderRegistryService,
  ) {}

  async getSnapshot(ownerId: string, projectId: string): Promise<string> {
    const project = await this.requireDeployedProject(ownerId, projectId);
    const adapter = this.registry.get(project.providerId!);
    return adapter.getLogs(project.providerResourceId!);
  }

  /**
   * Polls the provider adapter for its log snapshot and emits only the
   * newly-appended suffix as SSE messages — the client never re-renders
   * lines it already has, and we never poll faster than
   * POLL_INTERVAL_MS (spec §31: "Do NOT poll every second unnecessarily"
   * applies here too, even though it's the server doing the polling).
   */
  streamLogs(ownerId: string, projectId: string): Observable<{ data: string }> {
    return new Observable((subscriber) => {
      let cancelled = false;
      let lastSnapshot = '';

      const poll = async () => {
        if (cancelled) return;
        try {
          const project = await this.requireDeployedProject(ownerId, projectId);
          const adapter = this.registry.get(project.providerId!);
          const snapshot = await adapter.getLogs(project.providerResourceId!);

          if (snapshot !== lastSnapshot) {
            const newContent = snapshot.startsWith(lastSnapshot) ? snapshot.slice(lastSnapshot.length) : snapshot;
            lastSnapshot = snapshot;
            if (newContent.trim().length > 0) subscriber.next({ data: newContent });
          }
        } catch (err) {
          if (!cancelled) subscriber.error(err);
          return;
        }
        if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS);
      };

      let timer: ReturnType<typeof setTimeout>;
      poll();

      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    });
  }

  private async requireDeployedProject(ownerId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.deletedAt || project.ownerId !== ownerId) throw new AppError(ErrorCode.PROJECT_NOT_FOUND);
    if (!project.providerId || !project.providerResourceId) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, 'This project has not been deployed yet — there are no logs.');
    }
    return project;
  }
}
