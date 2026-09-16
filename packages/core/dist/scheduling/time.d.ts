import { BulkScheduleCadence } from '../types/index.js';
/**
 * Validates if a timezone string is a recognized IANA timezone identifier.
 */
export declare function isValidTimezone(timezone: string): boolean;
/**
 * Converts a local date string (e.g. "2026-09-21T09:00:00") in a specific timezone to a UTC Date.
 */
export declare function localToUtc(localDateStr: string | Date, timezone: string): Date;
/**
 * Formats a UTC Date for display in a specific timezone.
 */
export declare function utcToLocalDisplay(utcDate: Date, timezone: string, formatPattern?: string): string;
/**
 * Generates an array of scheduled execution times (in UTC) based on a cadence policy.
 */
export declare function generateScheduleSlots(cadence: BulkScheduleCadence, count: number): Date[];
/**
 * Calculates exponential backoff with jitter for retryable failures.
 * Backoff formula: baseDelay * 2^(attempt - 1) + jitter, capped at maxDelay.
 */
export declare function calculateNextRetryAttempt(attemptNumber: number, baseDelayMs?: number, // 30 seconds
maxDelayMs?: number): Date;
//# sourceMappingURL=time.d.ts.map