"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateTransitionService = exports.InvalidStateTransitionError = void 0;
class InvalidStateTransitionError extends Error {
    currentStatus;
    targetStatus;
    constructor(currentStatus, targetStatus, message) {
        super(message ??
            `Illegal state transition from "${currentStatus}" to "${targetStatus}".`);
        this.currentStatus = currentStatus;
        this.targetStatus = targetStatus;
        this.name = 'InvalidStateTransitionError';
    }
}
exports.InvalidStateTransitionError = InvalidStateTransitionError;
/**
 * Valid state transitions mapping.
 */
const VALID_TRANSITIONS = {
    draft: ['scheduled', 'canceled'],
    scheduled: ['publishing', 'canceled'],
    publishing: ['published', 'retryable_failure', 'failed'],
    retryable_failure: ['publishing', 'canceled'],
    failed: ['scheduled', 'canceled'], // Manual retry or cancellation
    published: [], // Terminal state
    canceled: ['scheduled'], // Re-scheduling allowed if user restores
};
class StateTransitionService {
    /**
     * Checks if a transition between two statuses is permissible.
     */
    static canTransition(from, to) {
        const allowed = VALID_TRANSITIONS[from];
        return !!allowed && allowed.includes(to);
    }
    /**
     * Validates and asserts a transition. Throws InvalidStateTransitionError if invalid.
     */
    static assertTransition(from, to) {
        if (!this.canTransition(from, to)) {
            throw new InvalidStateTransitionError(from, to);
        }
    }
    /**
     * Determines if a status is terminal (cannot transition further automatically).
     */
    static isTerminal(status) {
        return status === 'published';
    }
    /**
     * Determines if a status is currently active / awaiting worker pickup.
     */
    static isPending(status) {
        return status === 'scheduled' || status === 'retryable_failure';
    }
}
exports.StateTransitionService = StateTransitionService;
//# sourceMappingURL=state-machine.js.map