import { Module } from '@nestjs/common';
import { PterodactylAdapter } from './pterodactyl/pterodactyl.adapter';
import { RenderAdapter } from './render/render.adapter';
import { VercelAdapter } from './vercel/vercel.adapter';
import { CloudflareAdapter } from './cloudflare/cloudflare.adapter';
import { HerokuAdapter } from './heroku/heroku.adapter';
import { ProviderRegistryService } from './provider-registry.service';
import { ProviderRouterService } from './provider-router.service';

@Module({
  providers: [
    PterodactylAdapter,
    RenderAdapter,
    VercelAdapter,
    CloudflareAdapter,
    HerokuAdapter,
    ProviderRegistryService,
    ProviderRouterService,
  ],
  exports: [ProviderRegistryService, ProviderRouterService],
})
export class ProvidersModule {}
