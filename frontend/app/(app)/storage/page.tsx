'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { HardDrive, Plus, Trash2, Download, Upload, FolderOpen } from 'lucide-react';
import { storageApi } from '@/lib/api/storage';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export default function StoragePage() {
  const qc = useQueryClient();
  const usageQuery = useQuery({ queryKey: ['storage', 'usage'], queryFn: storageApi.getUsage });
  const bucketsQuery = useQuery({ queryKey: ['storage', 'buckets'], queryFn: storageApi.listBuckets });
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [newBucketName, setNewBucketName] = useState('');

  const filesQuery = useQuery({
    queryKey: ['storage', 'files', selectedBucket],
    queryFn: () => storageApi.listFiles(selectedBucket!),
    enabled: Boolean(selectedBucket),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['storage'] });
  };

  const createBucketMutation = useMutation({
    mutationFn: (name: string) => storageApi.createBucket(name),
    onSuccess: () => { invalidateAll(); setNewBucketName(''); toast.success('Bucket created.'); },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not create bucket.'),
  });
  const deleteBucketMutation = useMutation({
    mutationFn: (id: string) => storageApi.deleteBucket(id),
    onSuccess: () => { invalidateAll(); setSelectedBucket(null); },
  });
  const uploadMutation = useMutation({
    mutationFn: ({ bucketId, file }: { bucketId: string; file: File }) => storageApi.upload(bucketId, file),
    onSuccess: () => { invalidateAll(); toast.success('File uploaded.'); },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Upload failed.'),
  });
  const deleteFileMutation = useMutation({
    mutationFn: ({ bucketId, key }: { bucketId: string; key: string }) => storageApi.deleteFile(bucketId, key),
    onSuccess: invalidateAll,
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Storage</h1>
        {usageQuery.data && (
          <p className="text-sm text-muted-foreground">
            {formatBytes(usageQuery.data.totalBytes)} used · {usageQuery.data.fileCount} files
          </p>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="new-bucket" value={newBucketName} onChange={(e) => setNewBucketName(e.target.value)} className="text-sm" />
            <Button size="icon" aria-label="Create bucket" onClick={() => createBucketMutation.mutate(newBucketName)} disabled={!newBucketName.trim()}>
              <Plus className="h-4 w-4" aria-hidden />
            </Button>
          </div>

          {bucketsQuery.isLoading && <Skeleton className="h-24" />}
          {bucketsQuery.data && bucketsQuery.data.length === 0 && (
            <p className="text-xs text-muted-foreground">No buckets yet.</p>
          )}
          <div className="space-y-1">
            {bucketsQuery.data?.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBucket(b.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${selectedBucket === b.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
              >
                <span className="flex items-center gap-1.5"><FolderOpen className="h-3.5 w-3.5" aria-hidden /> {b.name}</span>
                <span className="text-xs text-muted-foreground">{b.fileCount}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          {!selectedBucket ? (
            <EmptyState icon={HardDrive} title="Select a bucket" description="Choose a bucket on the left to view its files." />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted">
                  <Upload className="h-3.5 w-3.5" aria-hidden /> Upload
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadMutation.mutate({ bucketId: selectedBucket, file });
                      e.target.value = '';
                    }}
                  />
                </label>
                <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => deleteBucketMutation.mutate(selectedBucket)}>
                  Delete Bucket
                </Button>
              </div>

              {filesQuery.data && filesQuery.data.length === 0 && <p className="text-sm text-muted-foreground">No files in this bucket yet.</p>}
              {filesQuery.data && filesQuery.data.length > 0 && (
                <div className="divide-y divide-border rounded-lg border border-border">
                  {filesQuery.data.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{f.key}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(f.sizeBytes)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" aria-label="Download" onClick={() => storageApi.download(selectedBucket, f.key, f.key)}>
                          <Download className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => deleteFileMutation.mutate({ bucketId: selectedBucket, key: f.key })}>
                          <Trash2 className="h-3.5 w-3.5 text-danger" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
