import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from './app-error';
import { ErrorCode, ERROR_MESSAGES } from './error-codes';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string; user?: { id?: string } }>();
    const requestId = request.requestId ?? 'unknown';

    if (exception instanceof AppError) {
      response.status(exception.getStatus()).json({
        success: false,
        error: { code: exception.code, message: exception.message, requestId },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        status === HttpStatus.UNPROCESSABLE_ENTITY || status === HttpStatus.BAD_REQUEST
          ? ERROR_MESSAGES[ErrorCode.VALIDATION_FAILED]
          : typeof body === 'string'
            ? body
            : ERROR_MESSAGES[ErrorCode.INTERNAL_SERVER_ERROR];
      response.status(status).json({
        success: false,
        error: {
          code: status === 401 ? ErrorCode.AUTH_TOKEN_INVALID : ErrorCode.VALIDATION_FAILED,
          message,
          requestId,
          // validation-pipe detail is safe to expose (field-level messages only)
          details: typeof body === 'object' ? (body as Record<string, unknown>)['message'] : undefined,
        },
      });
      return;
    }

    // Unknown/unexpected error — log full detail internally, never leak to client.
    this.logger.error(
      `Unhandled exception [requestId=${requestId}] [userId=${request.user?.id ?? 'anon'}] [${request.method} ${request.url}]`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: { code: ErrorCode.INTERNAL_SERVER_ERROR, message: ERROR_MESSAGES[ErrorCode.INTERNAL_SERVER_ERROR], requestId },
    });
  }
}
