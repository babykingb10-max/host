import { HttpException } from '@nestjs/common';
import { ErrorCode, ERROR_HTTP_STATUS, ERROR_MESSAGES } from './error-codes';

/**
 * The one exception type business logic should throw for expected,
 * typed failures. Controllers/services throw `new AppError(ErrorCode.X)`;
 * the global exception filter turns it into the standard API envelope
 * and never leaks internals (stack traces, provider errors, SQL, etc.)
 * to the client. Unexpected (non-AppError) exceptions are logged with
 * full detail server-side and returned to the client as a generic
 * INTERNAL_SERVER_ERROR.
 */
export class AppError extends HttpException {
  public readonly code: ErrorCode;
  public readonly context?: Record<string, unknown>;

  constructor(code: ErrorCode, overrideMessage?: string, context?: Record<string, unknown>) {
    const status = ERROR_HTTP_STATUS[code];
    const message = overrideMessage ?? ERROR_MESSAGES[code];
    super({ code, message }, status);
    this.code = code;
    this.context = context;
  }
}
