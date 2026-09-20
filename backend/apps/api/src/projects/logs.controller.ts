import { Controller, Get, MessageEvent, Param, Sse } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { LogsService } from './logs.service';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('logs')
@Controller('v1/projects/:projectId/logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get('snapshot')
  async getSnapshot(@CurrentUser() user: AccessTokenPayload, @Param('projectId') projectId: string) {
    const content = await this.logsService.getSnapshot(user.sub, projectId);
    return { content };
  }

  /** Same ?access_token= transport as the deployment stream (EventSource can't set headers). */
  @Sse('stream')
  stream(@CurrentUser() user: AccessTokenPayload, @Param('projectId') projectId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const sub = this.logsService.streamLogs(user.sub, projectId).subscribe({
        next: (event) => subscriber.next({ data: event.data }),
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete(),
      });
      return () => sub.unsubscribe();
    });
  }
}
