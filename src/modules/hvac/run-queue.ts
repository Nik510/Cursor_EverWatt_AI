/**
 * Minimal in-memory async queue for HVAC compute runs.
 *
 * MVP: single-process, best-effort.
 * - If server restarts, queued jobs are lost (records remain in storage).
 * - Concurrency defaults to 1 to avoid saturating Python compute.
 */
export type HvacQueuedJob = {
  runId: string;
  execute: () => Promise<void>;
};
 
const queue: HvacQueuedJob[] = [];
const queuedIds = new Set<string>();
let isDraining = false;
 
export function enqueueHvacJob(job: HvacQueuedJob): void {
  if (queuedIds.has(job.runId)) return;
  queuedIds.add(job.runId);
  queue.push(job);
  void drain();
}
 
async function drain(): Promise<void> {
  if (isDraining) return;
  isDraining = true;
  try {
    while (queue.length > 0) {
      const job = queue.shift()!;
      try {
        await job.execute();
      } finally {
        queuedIds.delete(job.runId);
      }
    }
  } finally {
    isDraining = false;
  }
}
 
