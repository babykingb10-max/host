import type { RedisOptions } from 'ioredis';

/**
 * Parses a REDIS_URL into explicit ioredis options rather than passing
 * the raw string through. This is required because managed Redis
 * providers (Redis Cloud, Heroku Data for Redis, etc.) commonly serve
 * TLS (`rediss://`) endpoints with a self-signed or provider-internal
 * CA certificate — ioredis's default TLS behavior rejects those
 * (`rejectUnauthorized: true`), causing an infinite reconnect loop
 * that never actually connects. Disabling certificate verification
 * here is standard practice for these providers: the connection is
 * still encrypted, only the CA chain check is relaxed.
 */
export function parseRedisConnection(redisUrl: string): RedisOptions {
  const url = new URL(redisUrl);
  const isTLS = url.protocol === 'rediss:';

  const options: RedisOptions = {
    host: url.hostname,
    port: Number(url.port) || 6379,
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    maxRetriesPerRequest: null,
  };

  if (isTLS) {
    options.tls = { rejectUnauthorized: false };
  }

  return options;
}
