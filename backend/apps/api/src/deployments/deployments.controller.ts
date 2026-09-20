import { Body, Controller, Get, MessageEvent, Param, Post, Sse } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { DeploymentsService } from './deployments.service';
import { DeploymentEventsService } from './deployment-events.service';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';
import { TriggerDeploymentDto } from './dto/deployments.dto';

@ApiTags('deployments')
@Controller('v1')
export class DeploymentsController {
  constructor(
    private readonly deploymentsService: DeploymentsService,
    private readonly deploymentEvents: DeploymentEventsService,
  ) {}

  @Post('projects/:projectId/deploy')
  trigger(@CurrentUser() user: AccessTokenPayload, @Param('projectId') projectId: string, @Body() dto: TriggerDeploymentDto) {
    return this.deploymentsService.trigger(user.sub, projectId, dto);
  }

  @Get('projects/:projectId/deployments')
  listForProject(@CurrentUser() user: AccessTokenPayload, @Param('projectId') projectId: string) {
    return this.deploymentsService.listForProject(user.sub, projectId);
  }

  @Get('deployments/:id')
  getOne(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.deploymentsService.getById(user.sub, id);
  }

  @Get('deployments/:id/events')
  getEvents(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.deploymentsService.getEventHistory(user.sub, id);
  }

  /**
   * Live event stream (spec §29, §39). EventSource can't send an
   * Authorization header, so the access token arrives as ?access_token=
   * (see JwtStrategy) — same guard, same ownership check as every other
   * route, just a different token transport.
   */
  @Sse('deployments/:id/stream')
  stream(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let closed = false;
      let unsubscribe: (() => Promise<void>) | null = null;

      (async () => {
        try {
          await this.deploymentsService.getById(user.sub, id); // throws if not found/not owned
          const history = await this.deploymentEvents.history(id);
          for (const event of history) {
            if (closed) return;
            subscriber.next({ data: event });
          }

          const isTerminal = history.some((e) => e.step === 'RUNNING' || e.step === 'FAILED' || e.step === 'CANCELLED');
          if (isTerminal) {
            subscriber.complete();
            return;
          }

          unsubscribe = await this.deploymentEvents.subscribe(id, (event) => {
            if (closed) return;
            subscriber.next({ data: event });
            if (event.step === 'RUNNING' || event.step === 'FAILED' || event.step === 'CANCELLED') {
              subscriber.complete();
            }
          });
        } catch (err) {
          subscriber.error(err);
        }
      })();

      return () => {
        closed = true;
        void unsubscribe?.();
      };
    });
  }
}
