import { PublishWorker } from './worker.js';

export * from './worker.js';

const worker = new PublishWorker();

process.on('SIGINT', () => {
  console.log('Received SIGINT. Initiating graceful shutdown of publish worker...');
  worker.stop();
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Initiating graceful shutdown of publish worker...');
  worker.stop();
});

// Auto-start if executed directly
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  worker.start().catch((err) => {
    console.error('Fatal worker error:', err);
    process.exit(1);
  });
}
