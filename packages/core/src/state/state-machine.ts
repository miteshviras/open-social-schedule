import { TargetStatus } from '../types/index.js';

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly currentStatus: TargetStatus,
    public readonly targetStatus: TargetStatus,
    message?: string
  ) {
    super(
      message ??
        `Illegal state transition from "${currentStatus}" to "${targetStatus}".`
    );
    this.name = 'InvalidStateTransitionError';
  }
}

/**
 * Valid state transitions mapping.
 */
const VALID_TRANSITIONS: Record<TargetStatus, TargetStatus[]> = {
  draft: ['scheduled', 'canceled'],
  scheduled: ['publishing', 'canceled'],
  publishing: ['published', 'retryable_failure', 'failed'],
  retryable_failure: ['publishing', 'canceled'],
  failed: ['scheduled', 'canceled'], // Manual retry or cancellation
  published: [], // Terminal state
  canceled: ['scheduled'], // Re-scheduling allowed if user restores
};

export class StateTransitionService {
  /**
   * Checks if a transition between two statuses is permissible.
   */
  public static canTransition(from: TargetStatus, to: TargetStatus): boolean {
    const allowed = VALID_TRANSITIONS[from];
    return !!allowed && allowed.includes(to);
  }

  /**
   * Validates and asserts a transition. Throws InvalidStateTransitionError if invalid.
   */
  public static assertTransition(from: TargetStatus, to: TargetStatus): void {
    if (!this.canTransition(from, to)) {
      throw new InvalidStateTransitionError(from, to);
    }
  }

  /**
   * Determines if a status is terminal (cannot transition further automatically).
   */
  public static isTerminal(status: TargetStatus): boolean {
    return status === 'published';
  }

  /**
   * Determines if a status is currently active / awaiting worker pickup.
   */
  public static isPending(status: TargetStatus): boolean {
    return status === 'scheduled' || status === 'retryable_failure';
  }
}
