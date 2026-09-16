import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { addMinutes, addDays, setHours, setMinutes, isBefore } from 'date-fns';
import { BulkScheduleCadence } from '../types/index.js';

/**
 * Validates if a timezone string is a recognized IANA timezone identifier.
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts a local date string (e.g. "2026-09-21T09:00:00") in a specific timezone to a UTC Date.
 */
export function localToUtc(localDateStr: string | Date, timezone: string): Date {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid IANA timezone identifier: "${timezone}"`);
  }
  return fromZonedTime(localDateStr, timezone);
}

/**
 * Formats a UTC Date for display in a specific timezone.
 */
export function utcToLocalDisplay(
  utcDate: Date,
  timezone: string,
  formatPattern: string = 'yyyy-MM-dd HH:mm:ss (zzz)'
): string {
  if (!isValidTimezone(timezone)) {
    return utcDate.toISOString();
  }
  return formatInTimeZone(utcDate, timezone, formatPattern);
}

/**
 * Generates an array of scheduled execution times (in UTC) based on a cadence policy.
 */
export function generateScheduleSlots(
  cadence: BulkScheduleCadence,
  count: number
): Date[] {
  const { startDateUtc, timezone, intervalMinutes, daysOfWeek, postingTimes } = cadence;
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  const slots: Date[] = [];

  // Scenario 1: Specific posting times per day (e.g. ["09:00", "15:00"])
  if (postingTimes && postingTimes.length > 0) {
    let currentDayZoned = toZonedTime(startDateUtc, timezone);
    const validDays = daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek : [0, 1, 2, 3, 4, 5, 6];

    while (slots.length < count) {
      const dayOfWeek = currentDayZoned.getDay();
      if (validDays.includes(dayOfWeek)) {
        for (const timeStr of postingTimes) {
          if (slots.length >= count) break;
          const [hours, minutes] = timeStr.split(':').map(Number);
          let candidateZoned = setHours(currentDayZoned, hours);
          candidateZoned = setMinutes(candidateZoned, minutes);

          const candidateUtc = fromZonedTime(candidateZoned, timezone);
          // Only add if after or equal to the start instant
          if (!isBefore(candidateUtc, startDateUtc)) {
            slots.push(candidateUtc);
          }
        }
      }
      currentDayZoned = addDays(currentDayZoned, 1);
    }
    return slots;
  }

  // Scenario 2: Interval in minutes (default 60 mins if unspecified)
  const stepMinutes = intervalMinutes && intervalMinutes > 0 ? intervalMinutes : 60;
  let currentUtc = new Date(startDateUtc.getTime());

  for (let i = 0; i < count; i++) {
    slots.push(new Date(currentUtc.getTime()));
    currentUtc = addMinutes(currentUtc, stepMinutes);
  }

  return slots;
}

/**
 * Calculates exponential backoff with jitter for retryable failures.
 * Backoff formula: baseDelay * 2^(attempt - 1) + jitter, capped at maxDelay.
 */
export function calculateNextRetryAttempt(
  attemptNumber: number,
  baseDelayMs: number = 30_000, // 30 seconds
  maxDelayMs: number = 3_600_000 // 1 hour cap
): Date {
  const exponent = Math.max(0, attemptNumber - 1);
  const rawDelay = baseDelayMs * Math.pow(2, exponent);
  const cappedDelay = Math.min(rawDelay, maxDelayMs);
  // Add up to 20% randomized jitter to prevent thundering herd
  const jitter = Math.floor(Math.random() * (cappedDelay * 0.2));
  const finalDelayMs = cappedDelay + jitter;

  return new Date(Date.now() + finalDelayMs);
}
