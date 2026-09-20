import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Wraps every successful controller return value in the platform's
 * standard envelope: { success: true, data: <value> }.
 * Errors are handled separately by GlobalExceptionFilter, which produces
 * the matching { success: false, error } shape.
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // Allow raw passthrough for streaming/binary responses that
        // explicitly opt out by returning { __raw: true, ...payload }.
        if (data && typeof data === 'object' && (data as Record<string, unknown>).__raw) {
          const { __raw, ...rest } = data as Record<string, unknown>;
          return rest;
        }
        return { success: true, data: data ?? null };
      }),
    );
  }
}
