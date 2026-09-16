import crypto from 'node:crypto';
import { prisma } from '@open-social/database';
import {
  AccountService,
  StateTransitionService,
  calculateNextRetryAttempt,
  TargetStatus,
} from '@open-social/core';
import {
  ProviderRegistry,
  classifyProviderError,
} from '@open-social/providers';

export interface WorkerOptions {
  pollIntervalMs?: number;
  leaseDurationMs?: number;
  maxAttempts?: number;
  concurrency?: number;
}

export class PublishWorker {
  private readonly pollIntervalMs: number;
  private readonly leaseDurationMs: number;
  private readonly maxAttempts: number;
  private readonly concurrency: number;
  private readonly workerId: string;
  private isRunning: boolean = false;
  private activeJobsCount: number = 0;

  constructor(options?: WorkerOptions) {
    this.pollIntervalMs = options?.pollIntervalMs ?? (Number(process.env.WORKER_POLL_INTERVAL_SECONDS) || 5) * 1000;
    this.leaseDurationMs = options?.leaseDurationMs ?? (Number(process.env.WORKER_LEASE_DURATION_SECONDS) || 60) * 1000;
    this.maxAttempts = options?.maxAttempts ?? 5;
    this.concurrency = options?.concurrency ?? (Number(process.env.WORKER_CONCURRENCY) || 3);
    this.workerId = `worker_${process.pid}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Reclaims any post targets stuck in 'publishing' whose lease has expired
   * due to a crashed worker process.
   */
  public async reclaimStaleLeases(): Promise<number> {
    const staleThreshold = new Date(Date.now() - this.leaseDurationMs);

    const staleTargets = await prisma.postTarget.findMany({
      where: {
        status: 'publishing',
        lockedAt: { lt: staleThreshold },
      },
      select: { id: true, attemptCount: true },
    });

    if (staleTargets.length === 0) return 0;

    for (const target of staleTargets) {
      console.warn(`[Worker ${this.workerId}] Reclaiming stale lease for target ${target.id}`);
      await prisma.postTarget.update({
        where: { id: target.id },
        data: {
          status: 'retryable_failure',
          nextAttemptAt: new Date(), // Retry immediately
          lockedAt: null,
          lockToken: null,
        },
      });

      // Record recovery attempt
      await prisma.publishAttempt.create({
        data: {
          postTargetId: target.id,
          attemptNumber: target.attemptCount + 1,
          outcome: 'failure',
          errorCode: 'WORKER_LEASE_TIMEOUT',
          errorMessageSafe: 'Previous publishing attempt timed out or worker crashed. Reclaimed.',
        },
      });
    }

    return staleTargets.length;
  }

  /**
   * Atomically claims due post targets by acquiring a lease and transitioning
   * them to 'publishing'.
   */
  public async claimDueJobs(limit: number = this.concurrency): Promise<Array<{ id: string; lockToken: string }>> {
    const now = new Date();
    const staleThreshold = new Date(Date.now() - this.leaseDurationMs);

    // Find candidate targets due for publishing
    const candidates = await prisma.postTarget.findMany({
      where: {
        OR: [
          {
            status: 'scheduled',
            publishAtUtc: { lte: now },
            OR: [{ lockedAt: null }, { lockedAt: { lt: staleThreshold } }],
          },
          {
            status: 'retryable_failure',
            nextAttemptAt: { lte: now },
            OR: [{ lockedAt: null }, { lockedAt: { lt: staleThreshold } }],
          },
        ],
      },
      take: limit,
      select: { id: true, status: true },
    });

    const claimedJobs: Array<{ id: string; lockToken: string }> = [];

    for (const candidate of candidates) {
      const lockToken = `${this.workerId}_${crypto.randomBytes(8).toString('hex')}`;

      // Atomic lock acquisition
      try {
        StateTransitionService.assertTransition(candidate.status as TargetStatus, 'publishing');

        const updated = await prisma.postTarget.updateMany({
          where: {
            id: candidate.id,
            status: candidate.status,
            OR: [{ lockedAt: null }, { lockedAt: { lt: staleThreshold } }],
          },
          data: {
            status: 'publishing',
            lockedAt: now,
            lockToken,
          },
        });

        if (updated.count === 1) {
          claimedJobs.push({ id: candidate.id, lockToken });
        }
      } catch (err) {
        // Ignored if contested
      }
    }

    return claimedJobs;
  }

  /**
   * Executes publication of a single claimed post target.
   */
  public async processTarget(targetId: string, lockToken: string): Promise<boolean> {
    const startedAt = new Date();

    const target = await prisma.postTarget.findUnique({
      where: { id: targetId },
      include: {
        post: {
          include: { media: true },
        },
        socialAccount: true,
      },
    });

    if (!target || target.lockToken !== lockToken) {
      console.warn(`[Worker ${this.workerId}] Target ${targetId} lost lease lock token.`);
      return false;
    }

    const nextAttemptNumber = target.attemptCount + 1;
    const content = target.contentOverride || target.post.canonicalContent;

    try {
      // 1. Decrypt credentials securely in memory
      const credentials = await AccountService.getDecryptedCredentials(target.socialAccountId);

      // 2. Resolve provider adapter
      const provider = ProviderRegistry.get(credentials.provider);

      // 3. Publish through provider adapter
      const result = await provider.publishPost({
        targetId: target.id,
        content,
        media: target.post.media?.map((m) => ({
          filePath: m.filePath,
          mimeType: m.mimeType,
          fileName: m.fileName,
          sizeBytes: m.sizeBytes,
        })),
        credentials: {
          accessToken: credentials.accessToken,
          providerAccountId: credentials.providerAccountId,
        },
      });

      // 4. Record successful attempt and transition state to published
      StateTransitionService.assertTransition('publishing', 'published');

      await prisma.$transaction([
        prisma.postTarget.update({
          where: { id: target.id },
          data: {
            status: 'published',
            publishedAt: new Date(),
            providerPostId: result.providerPostId,
            attemptCount: nextAttemptNumber,
            lockedAt: null,
            lockToken: null,
          },
        }),
        prisma.publishAttempt.create({
          data: {
            postTargetId: target.id,
            attemptNumber: nextAttemptNumber,
            startedAt,
            finishedAt: new Date(),
            outcome: 'success',
            providerRequestId: result.providerRequestId,
          },
        }),
      ]);

      console.log(
        `[Worker ${this.workerId}] Published target ${target.id} to ${credentials.provider} (ID: ${result.providerPostId})`
      );
      return true;
    } catch (err: any) {
      const finishedAt = new Date();
      // Classify error
      const classified = classifyProviderError(err);
      const isRetryable = classified.isRetryable && nextAttemptNumber < this.maxAttempts;
      const targetStatus: TargetStatus = isRetryable ? 'retryable_failure' : 'failed';

      const nextAttemptAt = isRetryable
        ? calculateNextRetryAttempt(nextAttemptNumber)
        : null;

      console.error(
        `[Worker ${this.workerId}] Target ${target.id} failed (${classified.code}): ${classified.message}. Retryable: ${isRetryable}`
      );

      await prisma.$transaction([
        prisma.postTarget.update({
          where: { id: target.id },
          data: {
            status: targetStatus,
            attemptCount: nextAttemptNumber,
            nextAttemptAt,
            lockedAt: null,
            lockToken: null,
          },
        }),
        prisma.publishAttempt.create({
          data: {
            postTargetId: target.id,
            attemptNumber: nextAttemptNumber,
            startedAt,
            finishedAt,
            outcome: 'failure',
            errorCode: classified.code,
            errorMessageSafe: classified.message,
          },
        }),
      ]);

      return false;
    }
  }

  /**
   * Executes a single polling and execution pass.
   */
  public async runOnce(): Promise<number> {
    await this.reclaimStaleLeases();

    const availableSlots = this.concurrency - this.activeJobsCount;
    if (availableSlots <= 0) return 0;

    const claimed = await this.claimDueJobs(availableSlots);
    if (claimed.length === 0) return 0;

    const promises = claimed.map(async ({ id, lockToken }) => {
      this.activeJobsCount++;
      try {
        await this.processTarget(id, lockToken);
      } finally {
        this.activeJobsCount--;
      }
    });

    await Promise.all(promises);
    return claimed.length;
  }

  /**
   * Starts the continuous background polling daemon.
   */
  public async start(): Promise<void> {
    this.isRunning = true;
    console.log(
      `[PublishWorker ${this.workerId}] Started daemon (polling every ${this.pollIntervalMs / 1000}s, concurrency: ${this.concurrency})`
    );

    while (this.isRunning) {
      try {
        await this.runOnce();
      } catch (err) {
        console.error(`[PublishWorker ${this.workerId}] Unexpected loop error:`, err);
      }
      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
    }

    console.log(`[PublishWorker ${this.workerId}] Daemon stopped.`);
  }

  /**
   * Requests a graceful shutdown of the worker daemon.
   */
  public stop(): void {
    this.isRunning = false;
  }
}
