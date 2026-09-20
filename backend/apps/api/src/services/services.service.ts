import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async listEnabled(category?: string) {
    const services = await this.prisma.service.findMany({
      where: { enabled: true, ...(category ? { category } : {}) },
      include: { plans: { where: { enabled: true }, orderBy: { priceAmount: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    return services.map(this.toPublicService);
  }

  async getBySlug(slug: string) {
    const service = await this.prisma.service.findUnique({
      where: { slug },
      include: { plans: { where: { enabled: true }, orderBy: { priceAmount: 'asc' } } },
    });
    if (!service || !service.enabled) throw new AppError(ErrorCode.NOT_FOUND, 'This service is not available.');
    return this.toPublicService(service);
  }

  /** Internal use (Projects module) — includes disabled-plan lookups for validation, not exposed publicly. */
  async requireEnabledServiceWithPlan(serviceId: string, servicePlanId: string) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId }, include: { plans: true } });
    if (!service || !service.enabled) throw new AppError(ErrorCode.NOT_FOUND, 'This service is not available.');

    const plan = service.plans.find((p) => p.id === servicePlanId && p.enabled);
    if (!plan) throw new AppError(ErrorCode.VALIDATION_FAILED, 'The selected plan is not available for this service.');

    return { service, plan };
  }

  private toPublicService(service: {
    id: string; slug: string; name: string; description: string; icon: string; category: string;
    supportedSources: string[]; supportedRuntimes: string[]; tags: string[];
    requiredFields: unknown; optionalFields: unknown; capabilities: unknown;
    plans: { id: string; key: string; name: string; cpuMillicores: number; ramMb: number; storageMb: number; priceAmount: number; priceCurrency: string; isDefault: boolean }[];
  }) {
    return {
      id: service.id,
      slug: service.slug,
      name: service.name,
      description: service.description,
      icon: service.icon,
      category: service.category,
      supportedSources: service.supportedSources,
      supportedRuntimes: service.supportedRuntimes,
      tags: service.tags,
      requiredFields: service.requiredFields,
      optionalFields: service.optionalFields,
      capabilities: service.capabilities,
      plans: service.plans.map((p) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        cpuMillicores: p.cpuMillicores,
        ramMb: p.ramMb,
        storageMb: p.storageMb,
        price: { amount: p.priceAmount, currency: p.priceCurrency },
        isDefault: p.isDefault,
      })),
    };
  }
}
