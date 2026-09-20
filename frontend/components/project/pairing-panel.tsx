'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Copy, Loader2, MessageCircle } from 'lucide-react';
import { usePairingStatus, useRequestPairing, useSubmitManualSession } from '@/hooks/use-pairing';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/api-error';

export function PairingPanel({ projectId }: { projectId: string }) {
  const statusQuery = usePairingStatus(projectId, true);
  const requestMutation = useRequestPairing(projectId);
  const manualMutation = useSubmitManualSession(projectId);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [manualSessionId, setManualSessionId] = useState('');

  const session = statusQuery.data;

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value).then(() => toast.success('Copied.'));
  };

  const handleRequest = async () => {
    try {
      await requestMutation.mutateAsync(phoneNumber || undefined);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not start pairing.');
    }
  };

  const handleManualSubmit = async () => {
    if (!manualSessionId.trim()) return;
    try {
      await manualMutation.mutateAsync(manualSessionId.trim());
      toast.success('Session saved — redeploy to apply it.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save session.');
    }
  };

  if (session?.status === 'CONNECTED') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 p-4 text-sm">
        <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
        WhatsApp connected.
      </div>
    );
  }

  if (!session || session.status === 'CANCELLED' || session.status === 'EXPIRED' || session.status === 'FAILED') {
    return (
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageCircle className="h-4 w-4" aria-hidden /> Connect WhatsApp
        </div>
        {session?.status === 'FAILED' && session.errorMessage && (
          <p className="text-xs text-danger">{session.errorMessage}</p>
        )}
        <Input placeholder="Phone number (if required)" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
        <Button size="sm" onClick={handleRequest} loading={requestMutation.isPending}>
          Start Pairing
        </Button>
      </div>
    );
  }

  if (session.mode === 'MANUAL_SESSION' && session.status === 'PENDING') {
    return (
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="text-sm font-medium">Paste Session ID</div>
        <p className="text-xs text-muted-foreground">Generate a session using your bot&apos;s pairing tool, then paste it here.</p>
        <Input placeholder="Session ID" value={manualSessionId} onChange={(e) => setManualSessionId(e.target.value)} />
        <Button size="sm" onClick={handleManualSubmit} loading={manualMutation.isPending}>
          Save Session
        </Button>
      </div>
    );
  }

  if (session.status === 'AWAITING_DEVICE') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Waiting for your bot to come online and generate a pairing code...
      </div>
    );
  }

  if (session.pairingCode) {
    return (
      <div className="space-y-2 rounded-lg border border-border p-4 text-center">
        <p className="text-xs text-muted-foreground">Your pairing code</p>
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono text-2xl font-bold tracking-widest">{session.pairingCode}</span>
          <Button variant="ghost" size="icon" aria-label="Copy" onClick={() => handleCopy(session.pairingCode!)}>
            <Copy className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Enter this code in WhatsApp &gt; Linked Devices.</p>
      </div>
    );
  }

  if (session.qrCodeData) {
    const isImage = session.qrCodeData.startsWith('data:image');
    return (
      <div className="space-y-2 rounded-lg border border-border p-4 text-center">
        <p className="text-xs text-muted-foreground">Scan this QR code with WhatsApp</p>
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.qrCodeData} alt="WhatsApp pairing QR code" className="mx-auto h-48 w-48" />
        ) : (
          <code className="block break-all rounded-md bg-muted p-3 text-left text-xs">{session.qrCodeData}</code>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Preparing pairing...
    </div>
  );
}
