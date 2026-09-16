"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleService = void 0;
const database_1 = require("@open-social/database");
const state_machine_js_1 = require("../state/state-machine.js");
const time_js_1 = require("../scheduling/time.js");
class ScheduleService {
    /**
     * Previews a bulk schedule before committing it to the database.
     * Generates display times in the user's timezone and flags row errors.
     */
    static async bulkSchedulePreview(rows, cadence) {
        if (!(0, time_js_1.isValidTimezone)(cadence.timezone)) {
            throw new Error(`Invalid timezone: ${cadence.timezone}`);
        }
        const slots = (0, time_js_1.generateScheduleSlots)(cadence, rows.length);
        const items = [];
        let validCount = 0;
        let invalidCount = 0;
        // Verify accounts exist
        const accountIds = Array.from(new Set(rows.map((r) => r.socialAccountId)));
        const existingAccounts = await database_1.prisma.socialAccount.findMany({
            where: { id: { in: accountIds } },
            select: { id: true, status: true },
        });
        const validAccountMap = new Map(existingAccounts.map((a) => [a.id, a.status]));
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const publishAtUtc = row.customPublishAtUtc || slots[i];
            let isValid = true;
            let validationError;
            if (!row.content || row.content.trim().length === 0) {
                isValid = false;
                validationError = 'Post content cannot be empty.';
            }
            else if (!validAccountMap.has(row.socialAccountId)) {
                isValid = false;
                validationError = 'Selected social account does not exist.';
            }
            else if (validAccountMap.get(row.socialAccountId) !== 'active') {
                isValid = false;
                validationError = 'Selected social account is inactive or revoked.';
            }
            if (isValid)
                validCount++;
            else
                invalidCount++;
            items.push({
                rowIndex: i + 1,
                content: row.content,
                socialAccountId: row.socialAccountId,
                publishAtUtc,
                publishAtLocalDisplay: (0, time_js_1.utcToLocalDisplay)(publishAtUtc, cadence.timezone),
                timezone: cadence.timezone,
                isValid,
                validationError,
            });
        }
        return {
            totalCount: rows.length,
            validCount,
            invalidCount,
            items,
        };
    }
    /**
     * Commits a previewed bulk schedule transactionally.
     */
    static async bulkScheduleCommit(userId, items) {
        return await database_1.prisma.$transaction(async (tx) => {
            const createdTargets = [];
            for (const item of items) {
                // Create canonical post
                const post = await tx.post.create({
                    data: {
                        userId,
                        canonicalContent: item.content,
                    },
                });
                // Create target
                const target = await tx.postTarget.create({
                    data: {
                        postId: post.id,
                        socialAccountId: item.socialAccountId,
                        contentOverride: item.contentOverride,
                        publishAtUtc: item.publishAtUtc,
                        timezone: item.timezone,
                        status: 'scheduled',
                    },
                });
                createdTargets.push(target);
            }
            return createdTargets;
        });
    }
    /**
     * Reschedules an existing post target.
     */
    static async rescheduleTarget(targetId, newPublishAtUtc, timezone) {
        const target = await database_1.prisma.postTarget.findUniqueOrThrow({
            where: { id: targetId },
        });
        if (timezone && !(0, time_js_1.isValidTimezone)(timezone)) {
            throw new Error(`Invalid timezone: ${timezone}`);
        }
        // Allow rescheduling if not already published or currently publishing
        if (target.status === 'publishing' || target.status === 'published') {
            throw new Error(`Cannot reschedule a target with status "${target.status}".`);
        }
        return await database_1.prisma.postTarget.update({
            where: { id: targetId },
            data: {
                publishAtUtc: newPublishAtUtc,
                timezone: timezone || target.timezone,
                status: 'scheduled',
                nextAttemptAt: null,
            },
        });
    }
    /**
     * Cancels a scheduled post target.
     */
    static async cancelSchedule(targetId) {
        const target = await database_1.prisma.postTarget.findUniqueOrThrow({
            where: { id: targetId },
        });
        state_machine_js_1.StateTransitionService.assertTransition(target.status, 'canceled');
        return await database_1.prisma.postTarget.update({
            where: { id: targetId },
            data: {
                status: 'canceled',
                lockedAt: null,
                lockToken: null,
            },
        });
    }
    /**
     * Immediately publishes a target (or enqueues it for instant worker pickup).
     */
    static async publishNow(targetId) {
        const target = await database_1.prisma.postTarget.findUniqueOrThrow({
            where: { id: targetId },
        });
        if (target.status === 'published') {
            throw new Error('This post target has already been published.');
        }
        return await database_1.prisma.postTarget.update({
            where: { id: targetId },
            data: {
                publishAtUtc: new Date(Date.now() - 1000), // Due in the past so picked up immediately
                status: 'scheduled',
                nextAttemptAt: null,
            },
        });
    }
    /**
     * Lists scheduled post targets with optional filters.
     */
    static async listScheduled(filters) {
        return await database_1.prisma.postTarget.findMany({
            where: {
                status: filters?.status,
                socialAccount: filters?.provider ? { provider: filters.provider } : undefined,
                publishAtUtc: {
                    gte: filters?.fromUtc,
                    lte: filters?.toUtc,
                },
            },
            include: {
                post: true,
                socialAccount: {
                    select: {
                        id: true,
                        provider: true,
                        displayName: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: { publishAtUtc: 'asc' },
            take: filters?.limit ?? 100,
            skip: filters?.offset ?? 0,
        });
    }
    /**
     * Retrieves single target details with attempt logs.
     */
    static async getTargetDetails(id) {
        return await database_1.prisma.postTarget.findUnique({
            where: { id },
            include: {
                post: {
                    include: {
                        media: true,
                    },
                },
                socialAccount: {
                    select: {
                        id: true,
                        provider: true,
                        displayName: true,
                        username: true,
                        avatarUrl: true,
                        status: true,
                    },
                },
                attempts: {
                    orderBy: { attemptNumber: 'desc' },
                },
            },
        });
    }
}
exports.ScheduleService = ScheduleService;
//# sourceMappingURL=schedule-service.js.map