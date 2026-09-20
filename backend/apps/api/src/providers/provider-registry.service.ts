import { Injectable } from '@nestjs/common';
import { PterodactylAdapter } from './pterodactyl/pterodactyl.adapter';
import { RenderAdapter } from './render/render.adapter';
import { VercelAdapter } from './vercel/vercel.adapter';
import { CloudflareAdapter } from './cloudflare/cloudflare.adapter';
import { HerokuAdapter } from './heroku/heroku.adapter';
import type { HostingProvider } from './provider.interface';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

@Injectable()
export class ProviderRegistryService {
  private readonly adapters: Record<string, HostingProvider>;

  constructor(
    pterodactyl: PterodactylAdapter,
    render: RenderAdapter,
    vercel: VercelAdapter,
    cloudflare: CloudflareAdapter,
    heroku: HerokuAdapter,
  ) {
    this.adapters = {
      PTERODACTYL: pterodactyl,
      RENDER: render,
      VERCEL: vercel,
      CLOUDFLARE: cloudflare,
      HEROKU: heroku,
    };
  }

  get(providerKey: string): HostingProvider {
    const adapter = this.adapters[providerKey];
    if (!adapter) throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR, `Unknown provider: ${providerKey}`);
    return adapter;
  }

  isConfigured(providerKey: string): boolean {
    return this.adapters[providerKey]?.isConfigured() ?? false;
  }

  all(): HostingProvider[] {
    return Object.values(this.adapters);
  }
}
