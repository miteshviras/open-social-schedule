import { prisma } from '@open-social/database';
import {
  BulkScheduleCadence,
  BulkScheduleRow,
  BulkSchedulePreviewResult,
  BulkSchedulePreviewItem,
  BulkScheduleTargetPreview,
  BulkCommitItem,
  TargetStatus,
} from '../types/index.js';
import { StateTransitionService } from '../state/state-machine.js';
import {
  generateScheduleSlots,
  isValidTimezone,
  utcToLocalDisplay,
} from '../scheduling/time.js';

const PROVIDER_CHAR_LIMITS: Record<string, number> = {
  linkedin: 3000,
  x: 280,
  mock: 5000,
};

export class ScheduleService {
  /**
   * Previews a bulk schedule before committing it to the database.
   * Generates display times in the user's timezone and flags platform-specific row errors.
   */
  public static async bulkSchedulePreview(
    rows: BulkScheduleRow[],
    cadence: BulkScheduleCadence
  ): Promise<BulkSchedulePreviewResult> {
    if (!isValidTimezone(cadence.timezone)) {
      throw new Error(`Invalid timezone: ${cadence.timezone}`);
    }

    const slots = generateScheduleSlots(cadence, rows.length);
    const items: BulkSchedulePreviewItem[] = [];
    let validCount = 0;
    let invalidCount = 0;

    // Collect all referenced accounts
    const accountIds = Array.from(
      new Set(
        rows.flatMap((r) => {
          const ids: string[] = [];
          if (r.socialAccountId) ids.push(r.socialAccountId);
          if (r.socialAccountIds) ids.push(...r.socialAccountIds);
          if (r.targets) ids.push(...r.targets.map((t) => t.socialAccountId));
          return ids;
        })
      )
    );

    const existingAccounts = await prisma.socialAccount.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, provider: true, displayName: true, status: true },
    });
    const accountMap = new Map(existingAccounts.map((a) => [a.id, a]));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const publishAtUtc = row.customPublishAtUtc || slots[i];

      // Determine targets for this row
      const targetConfigs: Array<{ socialAccountId: string; contentOverride?: string }> = [];
      if (row.targets && row.targets.length > 0) {
        for (const t of row.targets) {
          targetConfigs.push({ socialAccountId: t.socialAccountId, contentOverride: t.contentOverride });
        }
      } else if (row.socialAccountIds && row.socialAccountIds.length > 0) {
        for (const accId of row.socialAccountIds) {
          targetConfigs.push({ socialAccountId: accId, contentOverride: row.contentOverride });
        }
      } else if (row.socialAccountId) {
        targetConfigs.push({ socialAccountId: row.socialAccountId, contentOverride: row.contentOverride });
      }

      const targetPreviews: BulkScheduleTargetPreview[] = [];
      let isRowValid = true;
      let primaryValidationError: string | undefined;

      if (!row.content || row.content.trim().length === 0) {
        isRowValid = false;
        primaryValidationError = 'Post content cannot be empty.';
      } else if (targetConfigs.length === 0) {
        isRowValid = false;
        primaryValidationError = 'At least one social account target is required.';
      }

      for (const tgt of targetConfigs) {
        const acc = accountMap.get(tgt.socialAccountId);
        const effectiveContent = tgt.contentOverride || row.content;
        const charCount = effectiveContent.length;
        const provider = acc?.provider || 'generic';
        const charLimit = PROVIDER_CHAR_LIMITS[provider] || 3000;
        let isTargetValid = isRowValid;
        let targetError: string | undefined;

        if (!acc) {
          isTargetValid = false;
          targetError = 'Selected social account does not exist.';
        } else if (acc.status !== 'active') {
          isTargetValid = false;
          targetError = 'Selected social account is inactive or revoked.';
        } else if (charCount > charLimit) {
          isTargetValid = false;
          targetError = `Content exceeds ${acc.provider.toUpperCase()} limit of ${charLimit} characters (${charCount} chars).`;
        }

        if (!isTargetValid && !primaryValidationError) {
          primaryValidationError = targetError;
        }
        if (!isTargetValid) {
          isRowValid = false;
        }

        targetPreviews.push({
          socialAccountId: tgt.socialAccountId,
          provider,
          displayName: acc?.displayName || 'Unknown',
          content: effectiveContent,
          charCount,
          charLimit,
          isValid: isTargetValid,
          validationError: targetError,
        });
      }

      if (isRowValid) validCount++;
      else invalidCount++;

      items.push({
        rowIndex: i + 1,
        content: row.content,
        socialAccountId: targetConfigs[0]?.socialAccountId || row.socialAccountId || '',
        publishAtUtc,
        publishAtLocalDisplay: utcToLocalDisplay(publishAtUtc, cadence.timezone),
        timezone: cadence.timezone,
        isValid: isRowValid,
        validationError: primaryValidationError,
        targets: targetPreviews,
        isAllValid: isRowValid,
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
   * Commits a previewed bulk schedule transactionally (supports single and multi-platform targets).
   */
  public static async bulkScheduleCommit(
    userId: string,
    items: BulkCommitItem[] | any[]
  ) {
    return await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: `${userId}@local.dev` },
      });

      const createdTargets = [];

      for (const item of items) {
        // Create canonical post
        const post = await tx.post.create({
          data: {
            userId,
            canonicalContent: item.content,
          },
        });

        // If multi-target array is present, schedule to all targets
        if (item.targets && Array.isArray(item.targets) && item.targets.length > 0) {
          for (const tgt of item.targets) {
            const target = await tx.postTarget.create({
              data: {
                postId: post.id,
                socialAccountId: tgt.socialAccountId,
                contentOverride: tgt.contentOverride,
                publishAtUtc: tgt.publishAtUtc ? new Date(tgt.publishAtUtc) : new Date(item.publishAtUtc),
                timezone: tgt.timezone || item.timezone,
                status: 'scheduled',
              },
            });
            createdTargets.push(target);
          }
        } else if (item.socialAccountId) {
          // Legacy single-account support
          const target = await tx.postTarget.create({
            data: {
              postId: post.id,
              socialAccountId: item.socialAccountId,
              contentOverride: item.contentOverride,
              publishAtUtc: new Date(item.publishAtUtc),
              timezone: item.timezone,
              status: 'scheduled',
            },
          });
          createdTargets.push(target);
        }
      }

      return createdTargets;
    });
  }

  /**
   * Updates an existing post target (content, schedule time, timezone, status).
   */
  public static async updateTarget(
    targetId: string,
    data: {
      content?: string;
      contentOverride?: string;
      publishAtUtc?: Date;
      timezone?: string;
      status?: TargetStatus | string;
    }
  ) {
    const target = await prisma.postTarget.findUniqueOrThrow({
      where: { id: targetId },
      include: { post: true },
    });

    if (data.timezone && !isValidTimezone(data.timezone)) {
      throw new Error(`Invalid timezone: ${data.timezone}`);
    }

    const updateData: any = {};

    if (data.publishAtUtc) {
      updateData.publishAtUtc = data.publishAtUtc;
    }

    if (data.timezone) {
      updateData.timezone = data.timezone;
    }

    // Handle content updates
    if (data.contentOverride !== undefined) {
      updateData.contentOverride = data.contentOverride;
    } else if (data.content !== undefined) {
      // If target had a content override, update the override
      if (target.contentOverride !== null && target.contentOverride !== undefined) {
        updateData.contentOverride = data.content;
      } else {
        // Otherwise update canonical content on post
        await prisma.post.update({
          where: { id: target.postId },
          data: { canonicalContent: data.content },
        });
      }
    }

    // If rescheduling or resetting from failed/canceled, reset status to scheduled
    if (data.status) {
      updateData.status = data.status;
      if (data.status === 'scheduled') {
        updateData.nextAttemptAt = null;
        updateData.lockedAt = null;
        updateData.lockToken = null;
      }
    } else if (data.publishAtUtc && (target.status === 'failed' || target.status === 'retryable_failure' || target.status === 'canceled')) {
      updateData.status = 'scheduled';
      updateData.nextAttemptAt = null;
      updateData.lockedAt = null;
      updateData.lockToken = null;
    }

    return await prisma.postTarget.update({
      where: { id: targetId },
      data: updateData,
      include: {
        post: true,
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

  /**
   * Deletes a post target (either permanent hard-delete or cancel schedule).
   */
  public static async deleteTarget(targetId: string, permanent: boolean = false) {
    const target = await prisma.postTarget.findUniqueOrThrow({
      where: { id: targetId },
      include: {
        post: {
          include: { targets: true },
        },
      },
    });

    if (permanent) {
      await prisma.postTarget.delete({
        where: { id: targetId },
      });

      // If post has no other targets, delete the orphaned parent post
      if (target.post && target.post.targets.length <= 1) {
        await prisma.post.delete({
          where: { id: target.post.id },
        }).catch(() => {});
      }

      return {
        id: targetId,
        status: 'deleted',
        mode: 'permanent',
      };
    } else {
      return await this.cancelSchedule(targetId);
    }
  }

  /**
   * Reschedules an existing post target.
   */
  public static async rescheduleTarget(
    targetId: string,
    newPublishAtUtc: Date,
    timezone?: string
  ) {
    const target = await prisma.postTarget.findUniqueOrThrow({
      where: { id: targetId },
    });

    if (timezone && !isValidTimezone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    // Allow rescheduling if not already published or currently publishing
    if (target.status === 'publishing' || target.status === 'published') {
      throw new Error(`Cannot reschedule a target with status "${target.status}".`);
    }

    return await prisma.postTarget.update({
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
  public static async cancelSchedule(targetId: string) {
    const target = await prisma.postTarget.findUniqueOrThrow({
      where: { id: targetId },
    });

    StateTransitionService.assertTransition(target.status as TargetStatus, 'canceled');

    return await prisma.postTarget.update({
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
  public static async publishNow(targetId: string) {
    const target = await prisma.postTarget.findUniqueOrThrow({
      where: { id: targetId },
    });

    if (target.status === 'published') {
      throw new Error('This post target has already been published.');
    }

    return await prisma.postTarget.update({
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
  public static async listScheduled(filters?: {
    status?: TargetStatus;
    provider?: string;
    fromUtc?: Date;
    toUtc?: Date;
    limit?: number;
    offset?: number;
  }) {
    return await prisma.postTarget.findMany({
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
  public static async getTargetDetails(id: string) {
    return await prisma.postTarget.findUnique({
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

  /**
   * Retrieves recent failed publish attempts across all targets.
   */
  public static async getPublishErrors(limit: number = 20) {
    return await prisma.publishAttempt.findMany({
      where: { outcome: 'failure' },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        postTarget: {
          include: {
            post: true,
            socialAccount: {
              select: {
                id: true,
                provider: true,
                displayName: true,
              },
            },
          },
        },
      },
    });
  }
}
