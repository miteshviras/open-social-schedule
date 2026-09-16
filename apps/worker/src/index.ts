import { prisma } from '@open-social/database';

const POLL_INTERVAL_MS = (Number(process.env.WORKER_POLL_INTERVAL_SECONDS) || 5) * 1000;
let isRunning = true;

async function pollDueJobs() {
  try {
    const nowUtc = new Date();
    // Count pending scheduled items
    const dueCount = await prisma.postTarget.count({
      where: {
        status: { in: ['scheduled', 'retryable_failure'] },
        publishAtUtc: { lte: nowUtc },
      },
    });

    if (dueCount > 0) {
      console.log(`[Worker] Detected ${dueCount} due post targets at ${nowUtc.toISOString()}`);
    }
  } catch (err) {
    console.error('[Worker] Error checking due jobs:', err);
  }
}

async function startWorker() {
  console.log(`[Worker] Starting background publishing worker (polling every ${POLL_INTERVAL_MS / 1000}s)...`);

  while (isRunning) {
    await pollDueJobs();
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

process.on('SIGINT', () => {
  console.log('[Worker] Graceful shutdown requested (SIGINT)...');
  isRunning = false;
});

process.on('SIGTERM', () => {
  console.log('[Worker] Graceful shutdown requested (SIGTERM)...');
  isRunning = false;
});

if (process.env.NODE_ENV !== 'test') {
  startWorker();
}
