import { prisma } from '@open-social/database';
import { CreatePostInput } from '../types/index.js';
import { isValidTimezone } from '../scheduling/time.js';

export class PostService {
  /**
   * Creates a master canonical post, optionally with scheduled targets.
   */
  public static async createPost(input: CreatePostInput) {
    if (!input.canonicalContent || input.canonicalContent.trim().length === 0) {
      throw new Error('Post content cannot be empty.');
    }

    if (input.targets && input.targets.length > 0) {
      for (const target of input.targets) {
        if (!isValidTimezone(target.timezone)) {
          throw new Error(`Invalid timezone: ${target.timezone}`);
        }
      }
    }

    await prisma.user.upsert({
      where: { id: input.userId },
      update: {},
      create: { id: input.userId, email: `${input.userId}@local.dev` },
    });

    return await prisma.post.create({
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
  public static async getPost(id: string) {
    return await prisma.post.findUnique({
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
  public static async listPosts(userId?: string, limit: number = 50, offset: number = 0) {
    return await prisma.post.findMany({
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
   * Updates canonical post content.
   */
  public static async updatePost(id: string, data: { canonicalContent?: string }) {
    return await prisma.post.update({
      where: { id },
      data,
    });
  }

  /**
   * Deletes a post and cascades to targets.
   */
  public static async deletePost(id: string) {
    return await prisma.post.delete({
      where: { id },
    });
  }
}
