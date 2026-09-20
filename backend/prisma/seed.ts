import { PrismaClient, RoleKey } from '@prisma/client';

const prisma = new PrismaClient();

const ROLE_DEFINITIONS: { key: RoleKey; name: string; description: string }[] = [
  { key: RoleKey.SUPER_ADMIN, name: 'Super Admin', description: 'Full unrestricted platform access.' },
  { key: RoleKey.ADMIN, name: 'Admin', description: 'General platform administration.' },
  { key: RoleKey.SUPPORT, name: 'Support', description: 'Customer support operations.' },
  { key: RoleKey.FINANCE, name: 'Finance', description: 'Billing, credits and revenue operations.' },
  { key: RoleKey.INFRASTRUCTURE, name: 'Infrastructure', description: 'Provider and resource management.' },
  { key: RoleKey.CONTENT_MANAGER, name: 'Content Manager', description: 'Bot catalog, templates, announcements.' },
  { key: RoleKey.USER, name: 'User', description: 'Standard platform user.' },
];

// Full permission set backing the Admin Control Center (spec §6, §53-67).
const PERMISSION_KEYS = [
  'users.read',
  'users.update',
  'users.suspend',
  'projects.read',
  'projects.restart',
  'projects.stop',
  'projects.suspend',
  'projects.delete',
  'deployments.read',
  'deployments.retry',
  'bots.approve',
  'bots.update',
  'providers.read',
  'providers.manage',
  'credits.read',
  'credits.adjust',
  'billing.read',
  'billing.manage',
  'audit.read',
  'security.manage',
  'system.manage',
];

const ROLE_PERMISSIONS: Partial<Record<RoleKey, string[]>> = {
  [RoleKey.SUPER_ADMIN]: PERMISSION_KEYS,
  [RoleKey.ADMIN]: [
    'users.read', 'users.update', 'users.suspend',
    'projects.read', 'projects.restart', 'projects.stop', 'projects.suspend', 'projects.delete',
    'deployments.read', 'deployments.retry',
    'bots.approve', 'bots.update',
    'providers.read',
    'credits.read',
    'billing.read', 'billing.manage',
    'security.manage',
    'audit.read',
  ],
  [RoleKey.SUPPORT]: ['users.read', 'projects.read', 'deployments.read', 'audit.read'],
  [RoleKey.FINANCE]: ['users.read', 'credits.read', 'credits.adjust', 'billing.read', 'billing.manage'],
  [RoleKey.INFRASTRUCTURE]: ['projects.read', 'providers.read', 'providers.manage', 'deployments.read', 'deployments.retry'],
  [RoleKey.CONTENT_MANAGER]: ['bots.approve', 'bots.update'],
  [RoleKey.USER]: [],
};

async function main() {
  console.log('Seeding roles...');
  for (const role of ROLE_DEFINITIONS) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: { name: role.name, description: role.description },
      create: role,
    });
  }

  console.log('Seeding permissions...');
  for (const key of PERMISSION_KEYS) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }

  console.log('Linking role -> permissions...');
  for (const [roleKey, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { key: roleKey as RoleKey } });
    for (const permKey of permissionKeys ?? []) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key: permKey } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  console.log('Seed complete.');
}

async function seedDevCatalogAndSettings() {
  console.log('Seeding system settings...');
  await prisma.systemSetting.upsert({
    where: { key: 'projects.maxPerUser.free' },
    update: {},
    create: { key: 'projects.maxPerUser.free', value: 3 },
  });

  console.log('Seeding development service catalog...');
  const whatsapp = await prisma.service.upsert({
    where: { slug: 'whatsapp-bot' },
    update: {},
    create: {
      slug: 'whatsapp-bot',
      name: 'WhatsApp Bot',
      description: 'Host a WhatsApp automation bot from a repository, ZIP, or the admin bot catalog.',
      icon: 'message-circle',
      category: 'messaging',
      enabled: true,
      supportedSources: ['GITHUB', 'ZIP', 'ADMIN_CATALOG'],
      supportedRuntimes: ['NODE'],
      tags: ['whatsapp', 'bot', 'automation'],
      capabilities: { start: true, stop: true, restart: true, logs: true, console: false, backups: true, domains: false },
    },
  });

  await prisma.servicePlan.upsert({
    where: { serviceId_key: { serviceId: whatsapp.id, key: 'starter' } },
    update: {},
    create: {
      serviceId: whatsapp.id,
      key: 'starter',
      name: 'Starter',
      cpuMillicores: 500,
      ramMb: 512,
      storageMb: 1024,
      priceAmount: 0,
      priceCurrency: 'credits',
      isDefault: true,
    },
  });

  const website = await prisma.service.upsert({
    where: { slug: 'website' },
    update: {},
    create: {
      slug: 'website',
      name: 'Website',
      description: 'Host a static site, React, Vite, or Next.js project from GitHub or a ZIP upload.',
      icon: 'globe',
      category: 'web',
      enabled: true,
      supportedSources: ['GITHUB', 'ZIP'],
      supportedRuntimes: ['STATIC', 'REACT', 'VITE', 'NEXTJS'],
      tags: ['website', 'frontend', 'static'],
      capabilities: { start: true, stop: true, restart: true, logs: true, console: false, backups: false, domains: true },
    },
  });

  await prisma.servicePlan.upsert({
    where: { serviceId_key: { serviceId: website.id, key: 'starter' } },
    update: {},
    create: {
      serviceId: website.id,
      key: 'starter',
      name: 'Starter',
      cpuMillicores: 250,
      ramMb: 256,
      storageMb: 512,
      priceAmount: 0,
      priceCurrency: 'credits',
      isDefault: true,
    },
  });

  console.log('Development catalog seeded.');

  console.log('Seeding providers and default routing rules...');
  const providerDefs = [
    { key: 'PTERODACTYL' as const, name: 'Pterodactyl' },
    { key: 'RENDER' as const, name: 'Render' },
    { key: 'VERCEL' as const, name: 'Vercel' },
    { key: 'CLOUDFLARE' as const, name: 'Cloudflare' },
    { key: 'HEROKU' as const, name: 'Heroku' },
  ];
  const providers: Record<string, { id: string }> = {};
  for (const p of providerDefs) {
    providers[p.key] = await prisma.provider.upsert({
      where: { key: p.key },
      update: {},
      // Disabled by default — an admin enables a provider only once its
      // credentials are actually configured (Phase 9 Admin > Providers).
      create: { key: p.key, name: p.name, enabled: false },
    });
  }

  await prisma.providerRoutingRule.upsert({
    where: { id: 'seed-whatsapp-primary-pterodactyl' },
    update: {},
    create: {
      id: 'seed-whatsapp-primary-pterodactyl',
      serviceId: whatsapp.id,
      providerId: providers.PTERODACTYL.id,
      role: 'PRIMARY',
      priority: 0,
    },
  });

  await prisma.providerRoutingRule.upsert({
    where: { id: 'seed-website-primary-cloudflare' },
    update: {},
    create: {
      id: 'seed-website-primary-cloudflare',
      serviceId: website.id,
      providerId: providers.CLOUDFLARE.id,
      role: 'PRIMARY',
      priority: 0,
    },
  });
  await prisma.providerRoutingRule.upsert({
    where: { id: 'seed-website-fallback-vercel' },
    update: {},
    create: {
      id: 'seed-website-fallback-vercel',
      serviceId: website.id,
      providerId: providers.VERCEL.id,
      role: 'FALLBACK',
      priority: 0,
    },
  });

  console.log('Providers and routing rules seeded.');

  console.log('Seeding database, WordPress, and game server catalog entries...');
  const dbServices = [
    { slug: 'postgresql', name: 'PostgreSQL', desc: 'A managed PostgreSQL database.' },
    { slug: 'mysql', name: 'MySQL', desc: 'A managed MySQL database.' },
    { slug: 'mongodb', name: 'MongoDB', desc: 'A managed MongoDB database.' },
    { slug: 'redis-db', name: 'Redis', desc: 'A managed Redis instance.' },
  ];
  for (const d of dbServices) {
    const svc = await prisma.service.upsert({
      where: { slug: d.slug },
      update: {},
      create: {
        slug: d.slug,
        name: d.name,
        description: d.desc,
        icon: 'database',
        category: 'database',
        enabled: true,
        supportedSources: [],
        supportedRuntimes: [],
        tags: ['database'],
        capabilities: { start: true, stop: true, restart: true, logs: false, console: false, backups: true, domains: false },
      },
    });
    await prisma.servicePlan.upsert({
      where: { serviceId_key: { serviceId: svc.id, key: 'starter' } },
      update: {},
      create: { serviceId: svc.id, key: 'starter', name: 'Starter', cpuMillicores: 250, ramMb: 256, storageMb: 1024, priceAmount: 0, priceCurrency: 'credits', isDefault: true },
    });
    await prisma.providerRoutingRule.upsert({
      where: { id: `seed-${d.slug}-primary-pterodactyl` },
      update: {},
      create: { id: `seed-${d.slug}-primary-pterodactyl`, serviceId: svc.id, providerId: providers.PTERODACTYL.id, role: 'PRIMARY', priority: 0 },
    });
  }

  const wordpress = await prisma.service.upsert({
    where: { slug: 'wordpress' },
    update: {},
    create: {
      slug: 'wordpress',
      name: 'WordPress',
      description: 'One-click WordPress installation.',
      icon: 'layout-template',
      category: 'cms',
      enabled: true,
      supportedSources: ['DOCKER'],
      supportedRuntimes: ['DOCKER'],
      tags: ['wordpress', 'cms'],
      capabilities: { start: true, stop: true, restart: true, logs: true, console: false, backups: true, domains: true },
    },
  });
  await prisma.servicePlan.upsert({
    where: { serviceId_key: { serviceId: wordpress.id, key: 'starter' } },
    update: {},
    create: { serviceId: wordpress.id, key: 'starter', name: 'Starter', cpuMillicores: 500, ramMb: 512, storageMb: 2048, priceAmount: 0, priceCurrency: 'credits', isDefault: true },
  });
  await prisma.providerRoutingRule.upsert({
    where: { id: 'seed-wordpress-primary-pterodactyl' },
    update: {},
    create: { id: 'seed-wordpress-primary-pterodactyl', serviceId: wordpress.id, providerId: providers.PTERODACTYL.id, role: 'PRIMARY', priority: 0 },
  });

  const gameServer = await prisma.service.upsert({
    where: { slug: 'game-server' },
    update: {},
    create: {
      slug: 'game-server',
      name: 'Game Server',
      description: 'Host a Minecraft or other supported game server.',
      icon: 'gamepad-2',
      category: 'gaming',
      enabled: true,
      supportedSources: ['TEMPLATE'],
      supportedRuntimes: ['MINECRAFT_JAVA', 'MINECRAFT_BEDROCK'],
      tags: ['game', 'minecraft'],
      capabilities: { start: true, stop: true, restart: true, logs: true, console: true, backups: true, domains: false },
    },
  });
  await prisma.servicePlan.upsert({
    where: { serviceId_key: { serviceId: gameServer.id, key: 'starter' } },
    update: {},
    create: { serviceId: gameServer.id, key: 'starter', name: 'Starter', cpuMillicores: 1000, ramMb: 2048, storageMb: 4096, priceAmount: 0, priceCurrency: 'credits', isDefault: true },
  });
  await prisma.providerRoutingRule.upsert({
    where: { id: 'seed-game-server-primary-pterodactyl' },
    update: {},
    create: { id: 'seed-game-server-primary-pterodactyl', serviceId: gameServer.id, providerId: providers.PTERODACTYL.id, role: 'PRIMARY', priority: 0 },
  });

  console.log('Seeding a sample WhatsApp bot catalog entry...');
  await prisma.bot.upsert({
    where: { id: 'seed-adevos-sample-bot' },
    update: {},
    create: {
      id: 'seed-adevos-sample-bot',
      name: 'Adevos-X Sample Bot',
      description: 'A minimal starter WhatsApp bot to try the platform end-to-end.',
      category: 'utility',
      tags: ['starter', 'sample'],
      repository: 'https://github.com/adevos-x/sample-whatsapp-bot',
      branch: 'main',
      runtime: 'NODE',
      packageManager: 'npm',
      startCommand: 'npm start',
      requiredEnvFields: [{ key: 'OWNER_NUMBER', type: 'phone', required: true }],
      optionalEnvFields: [{ key: 'PREFIX', type: 'text', required: false, default: '.' }],
      resourceRequirements: { cpuMillicores: 500, ramMb: 512, storageMb: 1024 },
      pairingMode: 'MANUAL_SESSION',
      documentationUrl: 'https://docs.adevos-x.example/bots/sample',
      visibility: 'PUBLIC',
      approved: true,
      disabled: false,
    },
  });

  console.log('Seeding subscription plans...');
  const planDefs = [
    { tier: 'FREE' as const, name: 'Free', priceAmount: 0, maxProjects: 3, maxDeploymentsPerDay: 10, allowsCustomDomains: false, allowsBackups: false, alwaysOn: false },
    { tier: 'STARTER' as const, name: 'Starter', priceAmount: 500, maxProjects: 10, maxDeploymentsPerDay: 50, allowsCustomDomains: true, allowsBackups: false, alwaysOn: true },
    { tier: 'PRO' as const, name: 'Pro', priceAmount: 2000, maxProjects: 30, maxDeploymentsPerDay: 200, allowsCustomDomains: true, allowsBackups: true, alwaysOn: true },
    { tier: 'BUSINESS' as const, name: 'Business', priceAmount: 8000, maxProjects: 100, maxDeploymentsPerDay: 1000, allowsCustomDomains: true, allowsBackups: true, alwaysOn: true },
  ];
  for (const p of planDefs) {
    await prisma.subscriptionPlan.upsert({ where: { tier: p.tier }, update: {}, create: p });
  }

  console.log('Seeding a sample promotion campaign...');
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  await prisma.promotionCampaign.upsert({
    where: { id: 'seed-welcome-promo' },
    update: {},
    create: {
      id: 'seed-welcome-promo',
      title: 'Welcome Bonus',
      description: 'Claim a one-time welcome bonus for joining Adevos-X.',
      rewardAmount: 50,
      startAt: now,
      endAt: in30Days,
      perUserLimit: 1,
      active: true,
    },
  });

  console.log('Seeding feature flags...');
  const flagDefs = [
    { key: 'WHATSAPP_HOSTING', label: 'WhatsApp Hosting' },
    { key: 'TELEGRAM_HOSTING', label: 'Telegram Hosting' },
    { key: 'DISCORD_HOSTING', label: 'Discord Hosting' },
    { key: 'DOCKER_HOSTING', label: 'Docker Hosting' },
    { key: 'GAME_SERVERS', label: 'Game Servers' },
    { key: 'DATABASE_HOSTING', label: 'Database Hosting' },
    { key: 'STORAGE', label: 'Storage' },
    { key: 'WORDPRESS', label: 'WordPress/CMS' },
    { key: 'AI_APPS', label: 'AI Apps' },
    { key: 'PUBLIC_BOT_SUBMISSION', label: 'Public Bot Submission' },
    { key: 'GITHUB_INTEGRATION', label: 'GitHub Integration' },
    { key: 'REWARDED_ADS', label: 'Rewarded Ads' },
    { key: 'REFERRALS', label: 'Referrals' },
    { key: 'PROMOTIONS', label: 'Promotions' },
  ];
  for (const f of flagDefs) {
    await prisma.featureFlag.upsert({ where: { key: f.key }, update: {}, create: { ...f, enabled: true } });
  }
}

main()
  .then(async () => {
    if (process.env.NODE_ENV !== 'production') {
      await seedDevCatalogAndSettings();
    }
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
