import { CreatePostInput } from '../types/index.js';
export declare class PostService {
    /**
     * Creates a master canonical post, optionally with scheduled targets.
     */
    static createPost(input: CreatePostInput): Promise<{
        targets: ({
            socialAccount: {
                id: string;
                provider: string;
                displayName: string;
                avatarUrl: string | null;
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
        })[];
    } & {
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        canonicalContent: string;
    }>;
    /**
     * Fetches a single post by ID with targets and media.
     */
    static getPost(id: string): Promise<({
        targets: ({
            socialAccount: {
                id: string;
                provider: string;
                displayName: string;
                avatarUrl: string | null;
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
        })[];
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
    }) | null>;
    /**
     * Lists posts for a user.
     */
    static listPosts(userId?: string, limit?: number, offset?: number): Promise<({
        targets: ({
            socialAccount: {
                id: string;
                provider: string;
                displayName: string;
                avatarUrl: string | null;
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
        })[];
    } & {
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        canonicalContent: string;
    })[]>;
    /**
     * Deletes a post and cascades to targets.
     */
    static deletePost(id: string): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        canonicalContent: string;
    }>;
}
//# sourceMappingURL=post-service.d.ts.map