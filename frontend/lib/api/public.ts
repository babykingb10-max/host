import type { ApiResponse } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface PublicServicePlan {
  id: string;
  key: string;
  name: string;
  cpuMillicores: number;
  ramMb: number;
  storageMb: number;
  price: { amount: number; currency: string };
  isDefault: boolean;
}

export interface PublicService {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  supportedSources: string[];
  supportedRuntimes: string[];
  tags: string[];
  plans: PublicServicePlan[];
}

async function publicFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 } });
    const body = (await res.json()) as ApiResponse<T>;
    if (!res.ok || !body.success) return null;
    return body.data;
  } catch {
    // Public marketing pages must render even if the API is briefly
    // unreachable — callers show an empty/fallback state, never a crash.
    return null;
  }
}

export function getPublicServices(): Promise<PublicService[] | null> {
  return publicFetch<PublicService[]>('/v1/services');
}

export function getPublicServiceBySlug(slug: string): Promise<PublicService | null> {
  return publicFetch<PublicService>(`/v1/services/${slug}`);
}

export interface HealthCheckResult {
  status: 'ok' | 'unhealthy';
  checks?: Record<string, boolean>;
}

export function getPlatformHealth(): Promise<HealthCheckResult | null> {
  return publicFetch<HealthCheckResult>('/health');
}
