import { prisma } from '@open-social/database';
import { AccountService, PostService, ScheduleService } from '@open-social/core';

async function seedDemo() {
  console.log('🌱 Seeding Open Social Scheduler demo data...');

  process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';
  process.env.ENCRYPTION_SECRET =
    process.env.ENCRYPTION_SECRET || 'local-demo-encryption-secret-32-chars!';

  // 1. Create or ensure default user
  const user = await prisma.user.upsert({
    where: { id: 'default_local_user' },
    update: {},
    create: {
      id: 'default_local_user',
      email: 'creator@local.dev',
      name: 'Local Creator',
    },
  });

  // 2. Connect Mock Social Account
  const mockAccount = await AccountService.connectAccount({
    userId: user.id,
    provider: 'mock',
    providerAccountId: 'mock_demo_acc_001',
    displayName: 'Alex Rivers (Tech Lead & Creator)',
    username: 'alexrivers',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop',
    accessToken: 'demo_encrypted_access_token_super_secret',
  });

  console.log(`✓ Connected mock channel: ${mockAccount.displayName}`);

  // 3. Create Sample Posts & Targets
  const now = Date.now();

  // Post 1: Already published post
  const p1 = await PostService.createPost({
    userId: user.id,
    canonicalContent: '🚀 Excited to launch Open Social Scheduler — the local-first, open-source social media scheduler for LinkedIn and X with an MCP-native AI interface!',
    targets: [
      {
        socialAccountId: mockAccount.id,
        publishAtUtc: new Date(now - 3600_000 * 2), // 2 hours ago
        timezone: 'UTC',
      },
    ],
  });

  // Mark target 1 as published with audit log
  await prisma.postTarget.update({
    where: { id: p1.targets[0].id },
    data: {
      status: 'published',
      publishedAt: new Date(now - 3600_000 * 2 + 1500),
      providerPostId: 'mock_published_launch_123',
    },
  });
  await prisma.publishAttempt.create({
    data: {
      postTargetId: p1.targets[0].id,
      attemptNumber: 1,
      startedAt: new Date(now - 3600_000 * 2),
      finishedAt: new Date(now - 3600_000 * 2 + 1500),
      outcome: 'success',
      providerRequestId: 'req_launch_post_success',
    },
  });

  // Post 2: Scheduled in queue (due in 45 minutes)
  await PostService.createPost({
    userId: user.id,
    canonicalContent: '5 Lessons learned from building a local-first application:\n1. Your database is your queue.\n2. Idempotency prevents duplicate disasters.\n3. Encrypt secrets at rest.\n4. Treat workers as crashable daemons.\n5. AI interfaces belong over domain services.',
    targets: [
      {
        socialAccountId: mockAccount.id,
        publishAtUtc: new Date(now + 45 * 60_000),
        timezone: 'UTC',
        contentOverride: '5 lessons from building local-first apps: 1. DB is queue. 2. Idempotency matters. 3. Encrypt tokens. 4. Workers crash. 5. AI loves MCP.',
      },
    ],
  });

  // Post 3: Scheduled for tomorrow
  await PostService.createPost({
    userId: user.id,
    canonicalContent: 'Why Model Context Protocol (MCP) changes how we interact with developer tooling. An in-depth dive coming up tomorrow morning! 🧵👇',
    targets: [
      {
        socialAccountId: mockAccount.id,
        publishAtUtc: new Date(now + 24 * 3600_000),
        timezone: 'UTC',
      },
    ],
  });

  // Post 4: Transient failure demonstrating retry backoff
  const p4 = await PostService.createPost({
    userId: user.id,
    canonicalContent: 'Testing rate limit recovery on social network API endpoints.',
    targets: [
      {
        socialAccountId: mockAccount.id,
        publishAtUtc: new Date(now - 300_000), // 5 min ago
        timezone: 'UTC',
      },
    ],
  });

  await prisma.postTarget.update({
    where: { id: p4.targets[0].id },
    data: {
      status: 'retryable_failure',
      attemptCount: 1,
      nextAttemptAt: new Date(now + 60_000), // Retry in 1 minute
    },
  });
  await prisma.publishAttempt.create({
    data: {
      postTargetId: p4.targets[0].id,
      attemptNumber: 1,
      startedAt: new Date(now - 300_000),
      finishedAt: new Date(now - 299_000),
      outcome: 'failure',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      errorMessageSafe: 'Social platform rate limit reached. Backing off and retrying.',
    },
  });

  console.log('✓ Seeded realistic sample posts, targets, and publish attempt logs.');
  console.log('✨ Seed complete! You can now start the dashboard or worker to explore.');
}

seedDemo()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
