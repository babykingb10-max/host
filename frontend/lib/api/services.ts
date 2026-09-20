import { api } from './http-client';
import type { PublicService } from './public';

export const servicesApi = {
  list: (category?: string) => api.get<PublicService[]>(`/v1/services${category ? `?category=${category}` : ''}`),
  get: (slug: string) => api.get<PublicService>(`/v1/services/${slug}`),
};
