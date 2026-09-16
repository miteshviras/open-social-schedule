import { TargetStatus } from '../types/index.js';
export declare class InvalidStateTransitionError extends Error {
    readonly currentStatus: TargetStatus;
    readonly targetStatus: TargetStatus;
    constructor(currentStatus: TargetStatus, targetStatus: TargetStatus, message?: string);
}
export declare class StateTransitionService {
    /**
     * Checks if a transition between two statuses is permissible.
     */
    static canTransition(from: TargetStatus, to: TargetStatus): boolean;
    /**
     * Validates and asserts a transition. Throws InvalidStateTransitionError if invalid.
     */
    static assertTransition(from: TargetStatus, to: TargetStatus): void;
    /**
     * Determines if a status is terminal (cannot transition further automatically).
     */
    static isTerminal(status: TargetStatus): boolean;
    /**
     * Determines if a status is currently active / awaiting worker pickup.
     */
    static isPending(status: TargetStatus): boolean;
}
//# sourceMappingURL=state-machine.d.ts.map