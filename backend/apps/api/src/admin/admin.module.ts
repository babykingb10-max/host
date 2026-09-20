import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminProjectsController } from './admin-projects.controller';
import { AdminProjectsService } from './admin-projects.service';
import { AdminBotSubmissionsController } from './admin-bot-submissions.controller';
import { AdminBotSubmissionsService } from './admin-bot-submissions.service';
import { AdminProvidersController } from './admin-providers.controller';
import { AdminProvidersService } from './admin-providers.service';
import { AdminCreditsController } from './admin-credits.controller';
import { AdminCreditsService } from './admin-credits.service';
import { AdminFeatureFlagsController, AdminFeatureFlagsService } from './admin-feature-flags.controller';
import { AdminAuditLogsController } from './admin-audit-logs.controller';
import { AdminAdsController, AdminAdsService } from './admin-ads.controller';
import { AdminPromotionsController, AdminPromotionsService } from './admin-promotions.controller';
import { AdminBillingController, AdminBillingService } from './admin-billing.controller';
import { AdminSecurityController } from './admin-security.controller';
import { AdminSettingsController, AdminSettingsService } from './admin-settings.controller';
import { ProvidersModule } from '../providers/providers.module';
import { DeploymentsModule } from '../deployments/deployments.module';
import { CreditsModule } from '../credits/credits.module';
import { AuditModule } from '../audit/audit.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [ProvidersModule, DeploymentsModule, CreditsModule, AuditModule, SecurityModule],
  controllers: [
    AdminUsersController,
    AdminProjectsController,
    AdminBotSubmissionsController,
    AdminProvidersController,
    AdminCreditsController,
    AdminFeatureFlagsController,
    AdminAuditLogsController,
    AdminAdsController,
    AdminPromotionsController,
    AdminBillingController,
    AdminSecurityController,
    AdminSettingsController,
  ],
  providers: [
    AdminUsersService,
    AdminProjectsService,
    AdminBotSubmissionsService,
    AdminProvidersService,
    AdminCreditsService,
    AdminFeatureFlagsService,
    AdminAdsService,
    AdminPromotionsService,
    AdminBillingService,
    AdminSettingsService,
  ],
})
export class AdminModule {}
