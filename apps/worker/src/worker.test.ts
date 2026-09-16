import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '@open-social/database';
import { AccountService, PostService } from '@open-social/core';
import { PublishWorker } from './worker.js';

describe('Publishing Worker Engine', () => {
  process.env.DATABASE_URL = 'file:./dev.db';
  process.env.ENCRYPTION_SECRET = 'test-secret-key-32-chars-length!';

  let mockAccountId: string;
  let testUserId = 'test_worker_user';

  before(async () => {
    // Clean up test records
    await prisma.publishAttempt.deleteMany();
    await prisma.postTarget.deleteMany();
    await prisma.post.deleteMany();
    await prisma.socialAccount.deleteMany();
    await prisma.user.deleteMany();

    // Create user and mock account
    await prisma.user.create({
      data: { id: testUserId, email: 'worker_test@example.com' },
    });

    const account = await AccountService.connectAccount({
      userId: testUserId,
      provider: 'mock',
      providerAccountId: 'mock_test_account_999',
      displayName: 'Test Mock Creator',
      accessToken: 'test_token_123',
    });
    mockAccountId = account.id;
  });

  it('should claim and successfully publish a due post target', async () => {
    // Create a due post target
    const post = await PostService.createPost({
      userId: testUserId,
      canonicalContent: 'Hello from worker test suite!',
      targets: [
        {
          socialAccountId: mockAccountId,
          publishAtUtc: new Date(Date.now() - 5000), // 5 seconds in past (due)
          timezone: 'UTC',
        },
      ],
    });

    const target = post.targets[0];
    assert.equal(target.status, 'scheduled');

    const worker = new PublishWorker({ leaseDurationMs: 5000 });
    const processedCount = await worker.runOnce();

    assert.equal(processedCount, 1);

    // Verify state transition to published
    const updated = await prisma.postTarget.findUniqueOrThrow({
      where: { id: target.id },
      include: { attempts: true },
    });

    assert.equal(updated.status, 'published');
    assert.ok(updated.publishedAt);
    assert.ok(updated.providerPostId);
    assert.equal(updated.lockToken, null);

    // Verify attempt log
    assert.equal(updated.attempts.length, 1);
    assert.equal(updated.attempts[0].outcome, 'success');
  });

  it('should transition to retryable_failure with backoff when transient error occurs', async () => {
    // Create a due post target with rate limit trigger
    const post = await PostService.createPost({
      userId: testUserId,
      canonicalContent: 'Testing worker retry __TRIGGER_RATE_LIMIT__',
      targets: [
        {
          socialAccountId: mockAccountId,
          publishAtUtc: new Date(Date.now() - 5000),
          timezone: 'UTC',
        },
      ],
    });

    const target = post.targets[0];
    const worker = new PublishWorker({ leaseDurationMs: 5000 });
    await worker.runOnce();

    const updated = await prisma.postTarget.findUniqueOrThrow({
      where: { id: target.id },
      include: { attempts: true },
    });

    assert.equal(updated.status, 'retryable_failure');
    assert.equal(updated.attemptCount, 1);
    assert.ok(updated.nextAttemptAt);
    assert.equal(updated.lockToken, null);

    // Verify attempt log
    assert.equal(updated.attempts.length, 1);
    assert.equal(updated.attempts[0].outcome, 'failure');
    assert.equal(updated.attempts[0].errorCode, 'RATE_LIMIT_EXCEEDED');
  });

  it('should safely reclaim stale leases if a worker crashes mid-publish', async () => {
    // Create a target simulated as stuck in 'publishing' from a crashed worker
    const post = await PostService.createPost({
      userId: testUserId,
      canonicalContent: 'Crashed worker test post',
      targets: [
        {
          socialAccountId: mockAccountId,
          publishAtUtc: new Date(Date.now() - 10000),
          timezone: 'UTC',
        },
      ],
    });

    const target = post.targets[0];
    // Manually simulate stuck lease
    await prisma.postTarget.update({
      where: { id: target.id },
      data: {
        status: 'publishing',
        lockedAt: new Date(Date.now() - 120_000), // 2 minutes ago
        lockToken: 'crashed_dead_worker_token',
      },
    });

    const worker = new PublishWorker({ leaseDurationMs: 60_000 });
    const reclaimedCount = await worker.reclaimStaleLeases();

    assert.equal(reclaimedCount, 1);

    const rescued = await prisma.postTarget.findUniqueOrThrow({
      where: { id: target.id },
      include: { attempts: true },
    });

    assert.equal(rescued.status, 'retryable_failure');
    assert.equal(rescued.lockToken, null);
    assert.ok(rescued.attempts.some((a) => a.errorCode === 'WORKER_LEASE_TIMEOUT'));
  });
});
