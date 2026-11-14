/**
 * Instance Background Worker Daemon
 *
 * Entry point for background job execution, Instagram API delivery, and rate-limit management.
 * Runs independently of the Next.js frontend and NestJS API to ensure asynchronous tasks
 * (DMs, comment replies, profile enrichment) do not block HTTP request cycles.
 *
 * Self-Hosting Architecture:
 * - Dual-Pipeline Poller: Processes real-time DMs/comments (Lane 1) and media/profiles (Lane 2).
 * - Redis: Optional for single-instance setups (in-memory rate limiting fallback).
 *   Required in production multi-replica deployments for distributed rate limiting.
 * - Graceful Shutdown: Intercepts SIGINT/SIGTERM to drain in-flight jobs and close connections cleanly.
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

// Ensure root and local .env are loaded for worker services
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { prisma } from '@instance/db';
import { closeRedisConnection } from './config/redis';
import { dbJobPoller } from './services/db-job-poller';

async function bootstrap() {
  console.log('------------------------------------------------------------');
  console.log('Starting @instance/workers daemon...');
  console.log(`Redis URL: ${process.env.REDIS_URL ? 'Configured' : 'Using default localhost:6379'}`);
  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
    console.warn('[Workers:WARN] REDIS_URL is not set in production. Distributed rate-limiting across worker replicas requires Redis.');
  }
  console.log('------------------------------------------------------------');

  // Start canonical Dual-Pipeline Database Job Poller
  // Lane 1 (Realtime DMs & Comments): 500ms cadence, batch size 20
  // Lane 2 (Media, Video Transcoding & Background): 2000ms cadence, batch size 5
  dbJobPoller.start({
    realtimeIntervalMs: 500,
    mediaIntervalMs: 2000,
    realtimeBatchSize: 20,
    mediaBatchSize: 5,
  });

  console.log('Dual-Pipeline background job poller successfully running.');
  console.log('Listening for queued background jobs...\n');

  // Graceful Shutdown Handling
  let isShuttingDown = false;
  const handleShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n[Workers] Received ${signal}. Initiating graceful shutdown...`);

    try {
      // 1. Stop DB Poller and drain in-flight jobs cleanly
      await dbJobPoller.stop();

      // 2. Close Redis connections
      await closeRedisConnection();

      // 3. Disconnect Prisma client
      await prisma.$disconnect();

      console.log('[Workers] Graceful shutdown completed cleanly.');
      const isCrash = signal === 'uncaughtException' || signal === 'unhandledRejection';
      process.exit(isCrash ? 1 : 0);
    } catch (err: any) {
      console.error('[Workers] Error during shutdown:', err.message);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  // Global process error handlers to prevent unhandled process crashes
  process.on('uncaughtException', (err: Error) => {
    console.error('[Workers] Uncaught exception:', err);
    handleShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason: any) => {
    console.error('[Workers] Unhandled promise rejection:', reason);
    handleShutdown('unhandledRejection');
  });
}

bootstrap().catch((err) => {
  console.error('[Workers] Fatal error during bootstrap:', err);
  process.exit(1);
});
