"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostService = void 0;
const database_1 = require("@open-social/database");
const time_js_1 = require("../scheduling/time.js");
class PostService {
    /**
     * Creates a master canonical post, optionally with scheduled targets.
     */
    static async createPost(input) {
        if (!input.canonicalContent || input.canonicalContent.trim().length === 0) {
            throw new Error('Post content cannot be empty.');
        }
        if (input.targets && input.targets.length > 0) {
            for (const target of input.targets) {
                if (!(0, time_js_1.isValidTimezone)(target.timezone)) {
                    throw new Error(`Invalid timezone: ${target.timezone}`);
                }
            }
        }
        return await database_1.prisma.post.create({
            data: {
                userId: input.userId,
                canonicalContent: input.canonicalContent,
                targets: input.targets && input.targets.length > 0
                    ? {
                        create: input.targets.map((t) => ({
                            socialAccountId: t.socialAccountId,
                            publishAtUtc: t.publishAtUtc,
                            timezone: t.timezone,
                            contentOverride: t.contentOverride,
                            status: 'scheduled',
                        })),
                    }
                    : undefined,
            },
            include: {
                targets: {
                    include: {
                        socialAccount: {
                            select: {
                                id: true,
                                provider: true,
                                displayName: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
            },
        });
    }
    /**
     * Fetches a single post by ID with targets and media.
     */
    static async getPost(id) {
        return await database_1.prisma.post.findUnique({
            where: { id },
            include: {
                targets: {
                    include: {
                        socialAccount: {
                            select: {
                                id: true,
                                provider: true,
                                displayName: true,
                                avatarUrl: true,
                            },
                        },
                        attempts: {
                            orderBy: { startedAt: 'desc' },
                        },
                    },
                },
                media: true,
            },
        });
    }
    /**
     * Lists posts for a user.
     */
    static async listPosts(userId, limit = 50, offset = 0) {
        return await database_1.prisma.post.findMany({
            where: userId ? { userId } : undefined,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            include: {
                targets: {
                    include: {
                        socialAccount: {
                            select: {
                                id: true,
                                provider: true,
                                displayName: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
            },
        });
    }
    /**
     * Deletes a post and cascades to targets.
     */
    static async deletePost(id) {
        return await database_1.prisma.post.delete({
            where: { id },
        });
    }
}
exports.PostService = PostService;
//# sourceMappingURL=post-service.js.map