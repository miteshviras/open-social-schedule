"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidTimezone = isValidTimezone;
exports.localToUtc = localToUtc;
exports.utcToLocalDisplay = utcToLocalDisplay;
exports.generateScheduleSlots = generateScheduleSlots;
exports.calculateNextRetryAttempt = calculateNextRetryAttempt;
const date_fns_tz_1 = require("date-fns-tz");
const date_fns_1 = require("date-fns");
/**
 * Validates if a timezone string is a recognized IANA timezone identifier.
 */
function isValidTimezone(timezone) {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Converts a local date string (e.g. "2026-09-21T09:00:00") in a specific timezone to a UTC Date.
 */
function localToUtc(localDateStr, timezone) {
    if (!isValidTimezone(timezone)) {
        throw new Error(`Invalid IANA timezone identifier: "${timezone}"`);
    }
    return (0, date_fns_tz_1.fromZonedTime)(localDateStr, timezone);
}
/**
 * Formats a UTC Date for display in a specific timezone.
 */
function utcToLocalDisplay(utcDate, timezone, formatPattern = 'yyyy-MM-dd HH:mm:ss (zzz)') {
    if (!isValidTimezone(timezone)) {
        return utcDate.toISOString();
    }
    return (0, date_fns_tz_1.formatInTimeZone)(utcDate, timezone, formatPattern);
}
/**
 * Generates an array of scheduled execution times (in UTC) based on a cadence policy.
 */
function generateScheduleSlots(cadence, count) {
    const { startDateUtc, timezone, intervalMinutes, daysOfWeek, postingTimes } = cadence;
    if (!isValidTimezone(timezone)) {
        throw new Error(`Invalid timezone: ${timezone}`);
    }
    const slots = [];
    // Scenario 1: Specific posting times per day (e.g. ["09:00", "15:00"])
    if (postingTimes && postingTimes.length > 0) {
        let currentDayZoned = (0, date_fns_tz_1.toZonedTime)(startDateUtc, timezone);
        const validDays = daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek : [0, 1, 2, 3, 4, 5, 6];
        while (slots.length < count) {
            const dayOfWeek = currentDayZoned.getDay();
            if (validDays.includes(dayOfWeek)) {
                for (const timeStr of postingTimes) {
                    if (slots.length >= count)
                        break;
                    const [hours, minutes] = timeStr.split(':').map(Number);
                    let candidateZoned = (0, date_fns_1.setHours)(currentDayZoned, hours);
                    candidateZoned = (0, date_fns_1.setMinutes)(candidateZoned, minutes);
                    const candidateUtc = (0, date_fns_tz_1.fromZonedTime)(candidateZoned, timezone);
                    // Only add if after or equal to the start instant
                    if (!(0, date_fns_1.isBefore)(candidateUtc, startDateUtc)) {
                        slots.push(candidateUtc);
                    }
                }
            }
            currentDayZoned = (0, date_fns_1.addDays)(currentDayZoned, 1);
        }
        return slots;
    }
    // Scenario 2: Interval in minutes (default 60 mins if unspecified)
    const stepMinutes = intervalMinutes && intervalMinutes > 0 ? intervalMinutes : 60;
    let currentUtc = new Date(startDateUtc.getTime());
    for (let i = 0; i < count; i++) {
        slots.push(new Date(currentUtc.getTime()));
        currentUtc = (0, date_fns_1.addMinutes)(currentUtc, stepMinutes);
    }
    return slots;
}
/**
 * Calculates exponential backoff with jitter for retryable failures.
 * Backoff formula: baseDelay * 2^(attempt - 1) + jitter, capped at maxDelay.
 */
function calculateNextRetryAttempt(attemptNumber, baseDelayMs = 30_000, // 30 seconds
maxDelayMs = 3_600_000 // 1 hour cap
) {
    const exponent = Math.max(0, attemptNumber - 1);
    const rawDelay = baseDelayMs * Math.pow(2, exponent);
    const cappedDelay = Math.min(rawDelay, maxDelayMs);
    // Add up to 20% randomized jitter to prevent thundering herd
    const jitter = Math.floor(Math.random() * (cappedDelay * 0.2));
    const finalDelayMs = cappedDelay + jitter;
    return new Date(Date.now() + finalDelayMs);
}
//# sourceMappingURL=time.js.map