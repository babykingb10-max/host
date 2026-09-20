import type { ProjectStatus } from '@prisma/client';

/** A deployment (or restart/stop/delete) is already in flight for these — block a new one (spec §96 deployment locking). */
export const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = [
  'CREATING', 'QUEUED', 'PROVISIONING', 'BUILDING', 'DEPLOYING', 'STARTING', 'HEALTH_CHECK', 'RESTARTING', 'DELETING',
];

export const TERMINAL_FAILURE_STATUSES: ProjectStatus[] = ['FAILED', 'CRASHED', 'UNHEALTHY'];
