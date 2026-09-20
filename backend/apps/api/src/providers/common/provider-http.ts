import { AppError } from '../../common/errors/app-error';
import { ErrorCode } from '../../common/errors/error-codes';

const DEFAULT_TIMEOUT_MS = 15_000;

export interface ProviderFetchOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * fetch() with a hard timeout and platform-error mapping (spec §98:
 * "Frontend should not depend on provider-specific errors"). Adapters
 * call this instead of raw fetch so every provider failure surfaces
 * uniformly as DEPLOYMENT_PROVIDER_UNAVAILABLE (transient) or
 * PROVIDER_CONFIGURATION_ERROR (permanent misconfiguration) to callers.
 */
export async function providerFetch(url: string, options: ProviderFetchOptions = {}): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (res.status === 401 || res.status === 403) {
      throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR);
    }
    if (res.status === 429 || res.status >= 500) {
      throw new AppError(ErrorCode.DEPLOYMENT_PROVIDER_UNAVAILABLE);
    }
    return res;
  } catch (err) {
    if (err instanceof AppError) throw err;
    // Network error, DNS failure, or our own abort-on-timeout.
    throw new AppError(ErrorCode.DEPLOYMENT_PROVIDER_UNAVAILABLE);
  } finally {
    clearTimeout(timer);
  }
}
