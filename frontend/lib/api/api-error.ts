import type { ApiErrorBody } from '@/types/api';

/**
 * The backend already returns a safe, user-facing `message` per error
 * (see backend common/errors/error-codes.ts). This map only overrides
 * cases where the frontend wants extra context or a different tone —
 * everything else falls through to the backend's message untouched.
 */
const CLIENT_MESSAGE_OVERRIDES: Partial<Record<string, string>> = {
  INSUFFICIENT_CREDITS: "You don't have enough credits for this operation. Top up or earn more from the Earn page.",
  DEPLOYMENT_PROVIDER_UNAVAILABLE: 'The hosting provider is temporarily unavailable. Your deployment has been queued and will retry automatically.',
  RATE_LIMIT_EXCEEDED: "You're doing that a little too fast — please wait a moment and try again.",
};

export class ApiError extends Error {
  readonly code: string;
  readonly requestId: string;
  readonly status: number;
  readonly details?: string[];

  constructor(body: ApiErrorBody['error'], status: number) {
    super(CLIENT_MESSAGE_OVERRIDES[body.code] ?? body.message);
    this.name = 'ApiError';
    this.code = body.code;
    this.requestId = body.requestId;
    this.status = status;
    this.details = body.details;
  }

  get isAuthError(): boolean {
    return this.code === 'AUTH_TOKEN_INVALID' || this.code === 'AUTH_SESSION_EXPIRED';
  }
}
