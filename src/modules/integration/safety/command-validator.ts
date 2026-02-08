/**
 * Command Validator
 *
 * Validates write commands before execution. This ensures predictable behavior and
 * supports auditability for M&V and change tracking.
 *
 * @see EVERWATT_AI_CORE_VISION.md
 */

import type { WriteCommand } from '../types';
import { ValidationError } from '../types';

export function validateWriteCommand(command: WriteCommand): void {
  if (!command) throw new ValidationError('WriteCommand is required');
  if (!command.point) throw new ValidationError('WriteCommand.point is required');
  if (!command.point.connectionId) throw new ValidationError('WriteCommand.point.connectionId is required');
  if (!command.point.pointId) throw new ValidationError('WriteCommand.point.pointId is required');

  // Strong recommendation: include a reason for all writes (audit trail)
  // We don’t hard-fail yet, but this will be enforced once UI/flows are wired.
  if (command.reason !== undefined && String(command.reason).trim().length === 0) {
    throw new ValidationError('WriteCommand.reason cannot be empty', command.point.connectionId, command.point.pointId);
  }

  const v = command.value as any;
  if (v === undefined) {
    throw new ValidationError('WriteCommand.value is required', command.point.connectionId, command.point.pointId);
  }
  if (typeof v === 'number' && !Number.isFinite(v)) {
    throw new ValidationError('WriteCommand.value must be a finite number', command.point.connectionId, command.point.pointId);
  }

  // Safety-critical guardrail: allow points to mark themselves as safety critical.
  const safetyCritical = Boolean(command.point.protocolData?.safetyCritical);
  if (safetyCritical) {
    throw new ValidationError(
      `Writes blocked for safetyCritical point ${command.point.pointId}. Remove safetyCritical or implement explicit override flow.`,
      command.point.connectionId,
      command.point.pointId
    );
  }
}


