import { api } from './http-client';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export const notificationsApi = {
  list: (unreadOnly?: boolean) => api.get<NotificationItem[]>(`/v1/notifications${unreadOnly ? '?unreadOnly=true' : ''}`),
  unreadCount: () => api.get<number>('/v1/notifications/unread-count'),
  markRead: (id: string) => api.patch<{ message: string }>(`/v1/notifications/${id}/read`),
  markAllRead: () => api.patch<{ message: string }>('/v1/notifications/read-all'),
  remove: (id: string) => api.delete<null>(`/v1/notifications/${id}`),
};
