'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, Plus, Trash2, Upload } from 'lucide-react';
import {
  useEnvironmentVariables, useCreateEnvVar, useDeleteEnvVar, useBulkImportEnv,
} from '@/hooks/use-environment';
import { environmentApi } from '@/lib/api/environment';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ApiError } from '@/lib/api/api-error';

export function EnvironmentVariablesPanel({ projectId }: { projectId: string }) {
  const varsQuery = useEnvironmentVariables(projectId);
  const createMutation = useCreateEnvVar(projectId);
  const deleteMutation = useDeleteEnvVar(projectId);
  const bulkImportMutation = useBulkImportEnv(projectId);

  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newIsSecret, setNewIsSecret] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');

  const handleReveal = async (varId: string) => {
    if (revealed[varId]) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[varId];
        return next;
      });
      return;
    }
    try {
      const { value } = await environmentApi.reveal(projectId, varId);
      setRevealed((prev) => ({ ...prev, [varId]: value }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not reveal value.');
    }
  };

  const handleAdd = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    try {
      await createMutation.mutateAsync({ key: newKey.trim().toUpperCase(), value: newValue, isSecret: newIsSecret });
      setNewKey('');
      setNewValue('');
      setNewIsSecret(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not add variable.');
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    const result = await bulkImportMutation.mutateAsync(importText);
    toast.success(`Imported ${result.imported} variable${result.imported === 1 ? '' : 's'}${result.skipped ? `, skipped ${result.skipped}` : ''}.`);
    setImportText('');
    setShowImport(false);
  };

  if (varsQuery.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Environment Variables</h2>
        <Button variant="outline" size="sm" onClick={() => setShowImport((s) => !s)} className="gap-1.5">
          <Upload className="h-3.5 w-3.5" aria-hidden /> Bulk Import
        </Button>
      </div>

      {showImport && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={'KEY=value\nANOTHER_KEY=value'}
            rows={4}
            className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
          />
          <Button size="sm" onClick={handleImport} loading={bulkImportMutation.isPending}>
            Import
          </Button>
        </div>
      )}

      {varsQuery.data && varsQuery.data.length === 0 && !showImport && (
        <EmptyState title="No environment variables yet" description="Add one below or bulk-import a .env file." />
      )}

      {varsQuery.data && varsQuery.data.length > 0 && (
        <div className="divide-y divide-border rounded-lg border border-border">
          {varsQuery.data.map((v) => (
            <div key={v.id} className="flex items-center gap-2 p-2.5">
              <code className="w-40 shrink-0 truncate text-xs font-semibold">{v.key}</code>
              <code className="flex-1 truncate text-xs text-muted-foreground">
                {v.isSecret ? revealed[v.id] ?? v.value : v.value}
              </code>
              {v.isSecret && (
                <Button variant="ghost" size="icon" aria-label="Reveal" onClick={() => handleReveal(v.id)}>
                  {revealed[v.id] ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete"
                onClick={() => deleteMutation.mutate(v.id)}
                className="text-danger hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-3">
        <Input placeholder="KEY" value={newKey} onChange={(e) => setNewKey(e.target.value)} className="w-40 font-mono text-xs" />
        <Input placeholder="value" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="flex-1 font-mono text-xs" />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={newIsSecret} onChange={(e) => setNewIsSecret(e.target.checked)} /> Secret
        </label>
        <Button size="sm" onClick={handleAdd} loading={createMutation.isPending} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" aria-hidden /> Add Variable
        </Button>
      </div>
    </div>
  );
}
