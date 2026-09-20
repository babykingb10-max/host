import { z } from 'zod';

/**
 * Every environment variable the platform depends on, validated at boot.
 * Provider credentials are optional at the schema level (per spec: the
 * adapter/config system must exist even when credentials are not yet
 * supplied) but each provider adapter independently reports a
 * PROVIDER_CONFIGURATION_ERROR at call time if its own required vars
 * are missing — see the individual files under providers/&lt;name&gt;/.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().default(30),

  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters (used for AES-256-GCM secret storage)'),

  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  STORAGE_ROOT: z.string().optional(), // defaults to ./storage-data if unset (spec §25 local adapter)

  // GitHub OAuth (Phase 5)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),

  // Providers (Phase 3) — optional; adapters validate their own presence
  PTERODACTYL_BASE_URL: z.string().optional(),
  PTERODACTYL_API_KEY: z.string().optional(),
  RENDER_API_KEY: z.string().optional(),
  VERCEL_API_TOKEN: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  HEROKU_API_KEY: z.string().optional(),

  // Payments (Phase 7)
  PAYMENT_PROVIDER_SECRET_KEY: z.string().optional(),
  PAYMENT_PROVIDER_WEBHOOK_SECRET: z.string().optional(),

  // Notifications (Phase 8)
  FCM_PROJECT_ID: z.string().optional(),
  FCM_CLIENT_EMAIL: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
  EMAIL_PROVIDER_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().optional(),

  // Observability (Phase 9)
  SENTRY_DSN: z.string().optional(),
  ANALYTICS_WRITE_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(rawConfig: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(rawConfig);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    // Intentionally a hard crash on boot — invalid config must never
    // reach a running instance.
    // eslint-disable-next-line no-console
    console.error(`\nInvalid environment configuration:\n${details}\n`);
    process.exit(1);
  }
  return parsed.data;
}
