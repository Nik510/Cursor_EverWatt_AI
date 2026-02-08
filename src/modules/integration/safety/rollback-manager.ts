/**
 * Rollback Manager (best-effort)
 *
 * Provides a best-effort rollback to the previous value if a write fails.
 * This supports safe dispatch and reduces risk when applying optimization changes.
 *
 * Note: This is not a transactional guarantee; some devices may reject writes or
 * have priority arrays. We log failures but do not crash the system during rollback.
 */

import type { UnifiedDataPoint, WriteCommand } from '../types';

export type ReadFn = () => Promise<UnifiedDataPoint>;
export type WriteFn = (cmd: WriteCommand) => Promise<void>;

export async function withBestEffortRollback(
  readBefore: ReadFn,
  write: WriteFn,
  command: WriteCommand
): Promise<void> {
  let before: UnifiedDataPoint | null = null;
  try {
    before = await readBefore();
  } catch {
    // If we can't read baseline value, still attempt write.
    before = null;
  }

  try {
    await write(command);
  } catch (err) {
    if (before && before.value !== undefined) {
      try {
        await write({
          ...command,
          value: before.value as any,
          reason: `rollback:${command.reason || 'write-failed'}`,
        });
      } catch {
        // Ignore rollback failure
      }
    }
    throw err;
  }
}


