'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Pause, Play, Search, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export function LogViewer({ projectId }: { projectId: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const bottomRef = useRef<HTMLDivElement>(null);
  const bufferRef = useRef<string[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    const url = `${API_URL}/v1/projects/${projectId}/logs/stream?access_token=${encodeURIComponent(accessToken)}`;
    const source = new EventSource(url);

    source.onmessage = (msg) => {
      const newLines = (msg.data as string).split('\n').filter(Boolean);
      bufferRef.current = [...bufferRef.current, ...newLines].slice(-2000); // cap client-side buffer
      if (!paused) setLines([...bufferRef.current]);
    };
    source.onerror = () => setError('Live log connection interrupted — this project may not support live logs, or has not been deployed yet.');

    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, accessToken]);

  useEffect(() => {
    if (!paused) setLines([...bufferRef.current]);
  }, [paused]);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, autoScroll]);

  const filteredLines = useMemo(
    () => (search ? lines.filter((l) => l.toLowerCase().includes(search.toLowerCase())) : lines),
    [lines, search],
  );

  const handleDownload = () => {
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectId}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 p-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs" />
        </div>
        <Button variant="outline" size="sm" onClick={() => setPaused((p) => !p)} className="gap-1.5">
          {paused ? <Play className="h-3.5 w-3.5" aria-hidden /> : <Pause className="h-3.5 w-3.5" aria-hidden />}
          {paused ? 'Resume' : 'Pause'}
        </Button>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} /> Auto-scroll
        </label>
        <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
          <Download className="h-3.5 w-3.5" aria-hidden /> Download
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            bufferRef.current = [];
            setLines([]);
          }}
          className="gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Clear
        </Button>
      </div>

      <div className="h-96 overflow-y-auto bg-black p-3 font-mono text-xs text-green-400">
        {error && lines.length === 0 && <p className="text-amber-400">{error}</p>}
        {!error && lines.length === 0 && <p className="text-muted-foreground">Waiting for logs...</p>}
        {filteredLines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all py-0.5">
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
