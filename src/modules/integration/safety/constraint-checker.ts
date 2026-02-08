/**
 * Constraint Checker
 *
 * Enforces basic safety constraints for write commands.
 *
 * @see EVERWATT_AI_CORE_VISION.md - Safety and provability (audit trail)
 */

import type { WriteCommand } from '../types';
import { ValidationError } from '../types';

export function checkWriteConstraints(command: WriteCommand): void {
  const { constraints, value, point } = command;
  if (!constraints) return;

  if (constraints.allowedValues && constraints.allowedValues.length > 0) {
    const ok = constraints.allowedValues.some((v) => v === value);
    if (!ok) {
      throw new ValidationError(
        `Value not in allowedValues for ${point.pointId}`,
        point.connectionId,
        point.pointId
      );
    }
  }

  if (typeof value === 'number') {
    if (constraints.min !== undefined && value < constraints.min) {
      throw new ValidationError(
        `Value below min (${constraints.min}) for ${point.pointId}`,
        point.connectionId,
        point.pointId
      );
    }
    if (constraints.max !== undefined && value > constraints.max) {
      throw new ValidationError(
        `Value above max (${constraints.max}) for ${point.pointId}`,
        point.connectionId,
        point.pointId
      );
    }
  }
}


