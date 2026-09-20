'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { projectKeys } from './use-projects';
import type { DeploymentEvent } from '@/lib/api/projects';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const TERMINAL_STEPS = new Set(['RUNNING', 'FAILED', 'CANCELLED']);

export function useDeploymentStream(deploymentId: string | null, projectId: string | null) {
  const [events, setEvents] = useState<DeploymentEvent[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setEvents([]);
    setIsComplete(false);
    if (!deploymentId || !accessToken) return;

    const url = `${API_URL}/v1/deployments/${deploymentId}/stream?access_token=${encodeURIComponent(accessToken)}`;
    const source = new EventSource(url);
    sourceRef.current = source;

    source.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as DeploymentEvent;
        setEvents((prev) => [...prev, event]);
        if (event.step && TERMINAL_STEPS.has(event.step)) {
          setIsComplete(true);
          source.close();
          if (projectId) {
            queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
            queryClient.invalidateQueries({ queryKey: projectKeys.deployments(projectId) });
          }
        }
      } catch {
        // Ignore malformed events rather than crashing the live view.
      }
    };

    source.onerror = () => {
      // EventSource auto-reconnects on transient network errors; if the
      // deployment already reached a terminal state we've closed it
      // above, so any error here is either transient (browser retries)
      // or the connection ending after .close() — nothing to surface.
    };

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [deploymentId, accessToken, projectId, queryClient]);

  return { events, isComplete };
}
