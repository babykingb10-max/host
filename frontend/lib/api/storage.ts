import { api } from './http-client';
import { useAuthStore } from '@/stores/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface StorageBucketView {
  id: string;
  name: string;
  fileCount: number;
  createdAt: string;
}

export interface StorageFileView {
  id: string;
  key: string;
  sizeBytes: number;
  contentType: string;
  createdAt: string;
}

export const storageApi = {
  getUsage: () => api.get<{ totalBytes: number; fileCount: number }>('/v1/storage/usage'),
  listBuckets: () => api.get<StorageBucketView[]>('/v1/storage/buckets'),
  createBucket: (name: string) => api.post<StorageBucketView>('/v1/storage/buckets', { name }),
  deleteBucket: (id: string) => api.delete<null>(`/v1/storage/buckets/${id}`),
  listFiles: (bucketId: string) => api.get<StorageFileView[]>(`/v1/storage/buckets/${bucketId}/files`),
  deleteFile: (bucketId: string, key: string) => api.delete<null>(`/v1/storage/buckets/${bucketId}/files/${encodeURIComponent(key)}`),

  async upload(bucketId: string, file: File): Promise<StorageFileView> {
    const form = new FormData();
    form.append('file', file);
    form.append('key', file.name);
    const res = await fetch(`${API_URL}/v1/storage/buckets/${bucketId}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
      body: form,
    });
    const body = await res.json();
    if (!res.ok || !body.success) throw new Error(body.error?.message ?? 'Upload failed');
    return body.data;
  },

  async download(bucketId: string, key: string, filename: string): Promise<void> {
    const res = await fetch(`${API_URL}/v1/storage/buckets/${bucketId}/files/${encodeURIComponent(key)}/download`, {
      headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
    });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
