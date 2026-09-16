import { BulkScheduleCadence, BulkScheduleRow, BulkSchedulePreviewResult, TargetStatus } from '../types/index.js';
export declare class ScheduleService {
    /**
     * Previews a bulk schedule before committing it to the database.
     * Generates display times in the user's timezone and flags row errors.
     */
    static bulkSchedulePreview(rows: BulkScheduleRow[], cadence: BulkScheduleCadence): Promise<BulkSchedulePreviewResult>;
    /**
     * Commits a previewed bulk schedule transactionally.
     */
    static bulkScheduleCommit(userId: string, items: Array<{
        content: string;
        contentOverride?: string;
        socialAccountId: string;
        publishAtUtc: Date;
        timezone: string;
    }>): Promise<{
        timezone: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        contentOverride: string | null;
        publishAtUtc: Date;
        nextAttemptAt: Date | null;
        attemptCount: number;
        lockedAt: Date | null;
        lockToken: string | null;
        providerPostId: string | null;
        publishedAt: Date | null;
        socialAccountId: string;
        postId: string;
    }[]>;
    /**
     * Reschedules an existing post target.
     */
    static rescheduleTarget(targetId: string, newPublishAtUtc: Date, timezone?: string): Promise<{
        timezone: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        contentOverride: string | null;
        publishAtUtc: Date;
        nextAttemptAt: Date | null;
        attemptCount: number;
        lockedAt: Date | null;
        lockToken: string | null;
        providerPostId: string | null;
        publishedAt: Date | null;
        socialAccountId: string;
        postId: string;
    }>;
    /**
     * Cancels a scheduled post target.
     */
    static cancelSchedule(targetId: string): Promise<{
        timezone: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        contentOverride: string | null;
        publishAtUtc: Date;
        nextAttemptAt: Date | null;
        attemptCount: number;
        lockedAt: Date | null;
        lockToken: string | null;
        providerPostId: string | null;
        publishedAt: Date | null;
        socialAccountId: string;
        postId: string;
    }>;
    /**
     * Immediately publishes a target (or enqueues it for instant worker pickup).
     */
    static publishNow(targetId: string): Promise<{
        timezone: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        contentOverride: string | null;
        publishAtUtc: Date;
        nextAttemptAt: Date | null;
        attemptCount: number;
        lockedAt: Date | null;
        lockToken: string | null;
        providerPostId: string | null;
        publishedAt: Date | null;
        socialAccountId: string;
        postId: string;
    }>;
    /**
     * Lists scheduled post targets with optional filters.
     */
    static listScheduled(filters?: {
        status?: TargetStatus;
        provider?: string;
        fromUtc?: Date;
        toUtc?: Date;
        limit?: number;
        offset?: number;
    }): Promise<({
        socialAccount: {
            id: string;
            provider: string;
            displayName: string;
            username: string | null;
            avatarUrl: string | null;
        };
        post: {
            id: string;
            userId: string;
            createdAt: Date;
            updatedAt: Date;
            canonicalContent: string;
        };
    } & {
        timezone: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        contentOverride: string | null;
        publishAtUtc: Date;
        nextAttemptAt: Date | null;
        attemptCount: number;
        lockedAt: Date | null;
        lockToken: string | null;
        providerPostId: string | null;
        publishedAt: Date | null;
        socialAccountId: string;
        postId: string;
    })[]>;
    /**
     * Retrieves single target details with attempt logs.
     */
    static getTargetDetails(id: string): Promise<({
        socialAccount: {
            id: string;
            provider: string;
            displayName: string;
            username: string | null;
            avatarUrl: string | null;
            status: string;
        };
        attempts: {
            id: string;
            createdAt: Date;
            startedAt: Date;
            attemptNumber: number;
            postTargetId: string;
            finishedAt: Date | null;
            outcome: string;
            errorCode: string | null;
            errorMessageSafe: string | null;
            providerRequestId: string | null;
        }[];
        post: {
            media: {
                id: string;
                createdAt: Date;
                postId: string | null;
                filePath: string;
                fileName: string;
                mimeType: string;
                sizeBytes: number;
                checksum: string | null;
            }[];
        } & {
            id: string;
            userId: string;
            createdAt: Date;
            updatedAt: Date;
            canonicalContent: string;
        };
    } & {
        timezone: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        contentOverride: string | null;
        publishAtUtc: Date;
        nextAttemptAt: Date | null;
        attemptCount: number;
        lockedAt: Date | null;
        lockToken: string | null;
        providerPostId: string | null;
        publishedAt: Date | null;
        socialAccountId: string;
        postId: string;
    }) | null>;
}
//# sourceMappingURL=schedule-service.d.ts.map