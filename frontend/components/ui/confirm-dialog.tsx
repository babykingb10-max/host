'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = true,
  requireTypedName,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  /** For dangerous operations, require typing this exact value before the confirm button enables (spec §79). */
  requireTypedName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const [typed, setTyped] = useState('');

  if (!open) return null;

  const canConfirm = !requireTypedName || typed === requireTypedName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          {destructive && (
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-danger/10">
              <AlertTriangle className="h-4.5 w-4.5 text-danger" aria-hidden />
            </div>
          )}
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        {requireTypedName && (
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={requireTypedName}
            className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={destructive ? 'destructive' : 'default'} size="sm" disabled={!canConfirm || loading} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
