import cron, { ScheduledTask } from 'node-cron';
import prisma from '../../config/database';
import { runSync, getSyncRunningState } from '../../services/cartrack/cartrackSync.service';

let currentTask: ScheduledTask | null = null;
let currentIntervalMinutes = 0;
let isSchedulerRunning = false;

function minutesToCron(minutes: number): string {
  if (minutes <= 0) return '*/15 * * * *';
  if (minutes < 60) return `*/${minutes} * * * *`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${mins} */${hours} * * *`;
}

export async function startScheduler(): Promise<void> {
  try {
    const config = await prisma.cartrackConfig.findFirst();
    if (!config || !config.isEnabled) {
      console.log('[Cartrack] Scheduler not started — integration is disabled or not configured');
      return;
    }

    const interval = config.syncIntervalMinutes || 15;
    const cronExpr = minutesToCron(interval);

    if (currentTask) {
      currentTask.stop();
      currentTask = null;
    }

    currentTask = cron.schedule(cronExpr, async () => {
      if (getSyncRunningState()) {
        console.log('[Cartrack] Skipping scheduled sync — previous sync still running');
        return;
      }
      console.log('[Cartrack] Starting scheduled sync...');
      try {
        await runSync('FULL', 'SCHEDULER');
      } catch (err) {
        console.error('[Cartrack] Scheduled sync error:', err);
      }
    });

    currentIntervalMinutes = interval;
    isSchedulerRunning = true;
    console.log(`[Cartrack] Scheduler started — syncing every ${interval} minutes (cron: ${cronExpr})`);
  } catch (err) {
    console.error('[Cartrack] Failed to start scheduler:', err);
  }
}

export function stopScheduler(): void {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }
  isSchedulerRunning = false;
  console.log('[Cartrack] Scheduler stopped');
}

export async function restartScheduler(): Promise<void> {
  stopScheduler();
  await startScheduler();
}

export function getSchedulerStatus(): {
  isRunning: boolean;
  isSyncing: boolean;
  intervalMinutes: number;
} {
  return {
    isRunning: isSchedulerRunning,
    isSyncing: getSyncRunningState(),
    intervalMinutes: currentIntervalMinutes,
  };
}
