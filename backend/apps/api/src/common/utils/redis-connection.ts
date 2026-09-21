import Redis, { type RedisOptions } from 'ioredis';

/**
 * Creates an ioredis client configured for managed Redis providers
 * (Heroku Data for Redis, Redis Cloud, etc.) that present a
 * self-signed/provider-internal TLS certificate. Two issues these
 * providers commonly trigger, both handled here:
 *
 * 1. ioredis's default TLS behavior rejects unverifiable certificate
 *    chains (`rejectUnauthorized: true`) — the connection is still
 *    encrypted, only the CA check is relaxed.
 * 2. Heroku's networking layer intermittently resolves addon hostnames
 *    to an IPv6 address that resets the socket mid-TLS-handshake
 *    ("Client network socket disconnected before secure TLS connection
 *    was established"); forcing IPv4 resolution (`family: 4`) is the
 *    documented fix.
 *
 * The raw connection string is passed through to ioredis's own URL
 * parser (rather than manually decomposing it) so username/password/
 * query-string edge cases are handled exactly as ioredis expects.
 */
export function createRedisClient(redisUrl: string, extra: Partial<RedisOptions> = {}): Redis {
  const isTLS = redisUrl.startsWith('rediss://');

  const options: Partial<RedisOptions> = {
    family: 4,
    maxRetriesPerRequest: null,
    connectTimeout: 15_000,
    retryStrategy: (times: number) => Math.min(times * 200, 5_000),
    ...(isTLS ? { tls: { rejectUnauthorized: false } } : {}),
    ...extra,
  };

  const client = new Redis(redisUrl, options);
  client.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error(`[redis] connection error: ${err.message}`);
  });
  return client;
}
