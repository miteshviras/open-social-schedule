import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StateTransitionService, InvalidStateTransitionError } from './state/state-machine.js';
import {
  isValidTimezone,
  localToUtc,
  utcToLocalDisplay,
  generateScheduleSlots,
  calculateNextRetryAttempt,
} from './scheduling/time.js';

describe('State Transition Service', () => {
  it('should allow valid lifecycle state transitions', () => {
    assert.equal(StateTransitionService.canTransition('draft', 'scheduled'), true);
    assert.equal(StateTransitionService.canTransition('scheduled', 'publishing'), true);
    assert.equal(StateTransitionService.canTransition('publishing', 'published'), true);
    assert.equal(StateTransitionService.canTransition('publishing', 'retryable_failure'), true);
    assert.equal(StateTransitionService.canTransition('retryable_failure', 'publishing'), true);
    assert.equal(StateTransitionService.canTransition('failed', 'scheduled'), true);
  });

  it('should reject illegal state transitions', () => {
    assert.equal(StateTransitionService.canTransition('draft', 'published'), false);
    assert.equal(StateTransitionService.canTransition('published', 'publishing'), false);
    assert.throws(
      () => StateTransitionService.assertTransition('published', 'scheduled'),
      InvalidStateTransitionError
    );
  });
});

describe('Scheduling & Timezone Calculations', () => {
  it('should validate timezone strings correctly', () => {
    assert.equal(isValidTimezone('Asia/Kolkata'), true);
    assert.equal(isValidTimezone('America/New_York'), true);
    assert.equal(isValidTimezone('UTC'), true);
    assert.equal(isValidTimezone('Invalid/Fake_Zone'), false);
  });

  it('should convert local times to UTC and back accurately', () => {
    const tz = 'Asia/Kolkata'; // UTC + 5:30
    const localInput = '2026-09-21T10:00:00';
    const utcDate = localToUtc(localInput, tz);

    // 10:00 AM IST should be 04:30 AM UTC
    assert.equal(utcDate.getUTCHours(), 4);
    assert.equal(utcDate.getUTCMinutes(), 30);

    const display = utcToLocalDisplay(utcDate, tz, 'yyyy-MM-dd HH:mm');
    assert.equal(display, '2026-09-21 10:00');
  });

  it('should generate sequential schedule slots for cadence', () => {
    const start = new Date('2026-09-21T09:00:00Z');
    const slots = generateScheduleSlots(
      {
        startDateUtc: start,
        timezone: 'UTC',
        intervalMinutes: 120, // every 2 hours
      },
      3
    );

    assert.equal(slots.length, 3);
    assert.equal(slots[0].toISOString(), '2026-09-21T09:00:00.000Z');
    assert.equal(slots[1].toISOString(), '2026-09-21T11:00:00.000Z');
    assert.equal(slots[2].toISOString(), '2026-09-21T13:00:00.000Z');
  });

  it('should calculate exponential backoff within bounds', () => {
    const next1 = calculateNextRetryAttempt(1, 1000, 10000);
    const now = Date.now();
    assert.ok(next1.getTime() >= now + 1000);

    const next4 = calculateNextRetryAttempt(4, 1000, 10000);
    assert.ok(next4.getTime() >= now + 8000);
  });
});
