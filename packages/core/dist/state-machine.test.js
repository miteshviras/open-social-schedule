"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const state_machine_js_1 = require("./state/state-machine.js");
const time_js_1 = require("./scheduling/time.js");
(0, node_test_1.describe)('State Transition Service', () => {
    (0, node_test_1.it)('should allow valid lifecycle state transitions', () => {
        strict_1.default.equal(state_machine_js_1.StateTransitionService.canTransition('draft', 'scheduled'), true);
        strict_1.default.equal(state_machine_js_1.StateTransitionService.canTransition('scheduled', 'publishing'), true);
        strict_1.default.equal(state_machine_js_1.StateTransitionService.canTransition('publishing', 'published'), true);
        strict_1.default.equal(state_machine_js_1.StateTransitionService.canTransition('publishing', 'retryable_failure'), true);
        strict_1.default.equal(state_machine_js_1.StateTransitionService.canTransition('retryable_failure', 'publishing'), true);
        strict_1.default.equal(state_machine_js_1.StateTransitionService.canTransition('failed', 'scheduled'), true);
    });
    (0, node_test_1.it)('should reject illegal state transitions', () => {
        strict_1.default.equal(state_machine_js_1.StateTransitionService.canTransition('draft', 'published'), false);
        strict_1.default.equal(state_machine_js_1.StateTransitionService.canTransition('published', 'publishing'), false);
        strict_1.default.throws(() => state_machine_js_1.StateTransitionService.assertTransition('published', 'scheduled'), state_machine_js_1.InvalidStateTransitionError);
    });
});
(0, node_test_1.describe)('Scheduling & Timezone Calculations', () => {
    (0, node_test_1.it)('should validate timezone strings correctly', () => {
        strict_1.default.equal((0, time_js_1.isValidTimezone)('Asia/Kolkata'), true);
        strict_1.default.equal((0, time_js_1.isValidTimezone)('America/New_York'), true);
        strict_1.default.equal((0, time_js_1.isValidTimezone)('UTC'), true);
        strict_1.default.equal((0, time_js_1.isValidTimezone)('Invalid/Fake_Zone'), false);
    });
    (0, node_test_1.it)('should convert local times to UTC and back accurately', () => {
        const tz = 'Asia/Kolkata'; // UTC + 5:30
        const localInput = '2026-09-21T10:00:00';
        const utcDate = (0, time_js_1.localToUtc)(localInput, tz);
        // 10:00 AM IST should be 04:30 AM UTC
        strict_1.default.equal(utcDate.getUTCHours(), 4);
        strict_1.default.equal(utcDate.getUTCMinutes(), 30);
        const display = (0, time_js_1.utcToLocalDisplay)(utcDate, tz, 'yyyy-MM-dd HH:mm');
        strict_1.default.equal(display, '2026-09-21 10:00');
    });
    (0, node_test_1.it)('should generate sequential schedule slots for cadence', () => {
        const start = new Date('2026-09-21T09:00:00Z');
        const slots = (0, time_js_1.generateScheduleSlots)({
            startDateUtc: start,
            timezone: 'UTC',
            intervalMinutes: 120, // every 2 hours
        }, 3);
        strict_1.default.equal(slots.length, 3);
        strict_1.default.equal(slots[0].toISOString(), '2026-09-21T09:00:00.000Z');
        strict_1.default.equal(slots[1].toISOString(), '2026-09-21T11:00:00.000Z');
        strict_1.default.equal(slots[2].toISOString(), '2026-09-21T13:00:00.000Z');
    });
    (0, node_test_1.it)('should calculate exponential backoff within bounds', () => {
        const next1 = (0, time_js_1.calculateNextRetryAttempt)(1, 1000, 10000);
        const now = Date.now();
        strict_1.default.ok(next1.getTime() >= now + 1000);
        const next4 = (0, time_js_1.calculateNextRetryAttempt)(4, 1000, 10000);
        strict_1.default.ok(next4.getTime() >= now + 8000);
    });
});
//# sourceMappingURL=state-machine.test.js.map