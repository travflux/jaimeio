/**
 * Standalone Tweet Scheduler — runs inside the Satire Engine server process.
 *
 * Reads schedule settings from the database and uses node-cron to
 * trigger daily standalone tweet generation at the configured time.
 *
 * Settings consumed:
 *   standalone_tweet_enabled         — master on/off switch ("true"/"false")
 *   standalone_tweet_auto_approve    — auto-approve generated tweets ("true"/"false")
 *   standalone_tweet_daily_limit     — max tweets to post per day (number string)
 *   standalone_tweet_schedule_time   — time to generate in HH:mm format (e.g., "07:00")
 *   standalone_tweet_batch_size      — number of tweets to generate per run (number string, default 8)
 *   schedule_timezone                — IANA timezone string (default: America/Los_Angeles)
 *
 * Persisted state:
 *   _last_standalone_tweet_run — ISO date string (YYYY-MM-DD) of the last run
 */
import cron from "node-cron";
import * as db from "./db";
import { generateStandaloneTweets, postNextStandaloneTweet } from "./standaloneXTweetEngine";

let currentTask: ReturnType<typeof cron.schedule> | null = null;
let currentCronExpression: string | null = null;
let lastRunResult: { time: string; status: string; message: string } | null = null;
let nextRunTime: string | null = null;
let isRunning = false;

const LAST_RUN_KEY = "_last_standalone_tweet_run";

async function loadLastRunDate(): Promise<string | null> {
  try {
    const setting = await db.getSetting(LAST_RUN_KEY);
    return setting?.value || null;
  } catch {
    return null;
  }
}

async function saveLastRunDate(dateStr: string): Promise<void> {
  try {
    await db.upsertSetting({
      key: LAST_RUN_KEY,
      value: dateStr,
      label: "Last Standalone Tweet Run",
      description: "Internal: Date of the last standalone tweet generation (YYYY-MM-DD). Do not edit.",
      category: "_internal",
      type: "string",
    });
  } catch (err) {
    console.error("[Standalone Tweet Scheduler] Failed to save last run date:", err);
  }
}

function calculateNextRun(hour: number, minute: number, timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const currentHour = parseInt(parts.find(p => p.type === "hour")?.value || "0");
    const currentMinute = parseInt(parts.find(p => p.type === "minute")?.value || "0");
    const todayMinutes = currentHour * 60 + currentMinute;
    const targetMinutes = hour * 60 + minute;
    const tomorrow = new Date(now);
    if (todayMinutes >= targetMinutes) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    const dateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return dateFormatter.format(tomorrow);
  } catch {
    return "Unknown";
  }
}

async function runStandaloneTweetGeneration(): Promise<void> {
  if (isRunning) {
    console.log("[Standalone Tweet Scheduler] Already running, skipping.");
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const lastRun = await loadLastRunDate();
  if (lastRun === today) {
    console.log(`[Standalone Tweet Scheduler] Already ran today (${today}). Skipping.`);
    lastRunResult = { time: new Date().toISOString(), status: "skipped", message: "Already ran today" };
    return;
  }

  // Check master switch
  const enabledSetting = await db.getSetting("standalone_tweet_enabled");
  if (enabledSetting?.value !== "true") {
    console.log("[Standalone Tweet Scheduler] Disabled. Skipping.");
    lastRunResult = { time: new Date().toISOString(), status: "skipped", message: "Standalone tweets disabled" };
    return;
  }

  isRunning = true;
  await saveLastRunDate(today);
  console.log(`[Standalone Tweet Scheduler] Starting generation run for ${today}`);

  try {
    const batchSizeSetting = await db.getSetting("standalone_tweet_batch_size");
    const batchSize = batchSizeSetting ? parseInt(batchSizeSetting.value) : 8;

    const result = await generateStandaloneTweets(batchSize);
    console.log(`[Standalone Tweet Scheduler] Generated ${result.generated} tweets, auto-approved ${result.autoApproved}`);

    // Post the first approved tweet immediately if auto-approve is on
    const autoApproveSetting = await db.getSetting("standalone_tweet_auto_approve");
    if (autoApproveSetting?.value === "true" && result.autoApproved > 0) {
      const postResult = await postNextStandaloneTweet();
      console.log(`[Standalone Tweet Scheduler] Posted ${postResult.posted} tweet(s)`);
    }

    lastRunResult = {
      time: new Date().toISOString(),
      status: "success",
      message: `Generated ${result.generated} tweets, auto-approved ${result.autoApproved}`,
    };
  } catch (err) {
    console.error("[Standalone Tweet Scheduler] Run error:", err);
    lastRunResult = {
      time: new Date().toISOString(),
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  } finally {
    isRunning = false;
  }
}

export async function initStandaloneTweetScheduler(): Promise<void> {
  try {
    const timeSetting = await db.getSetting("standalone_tweet_schedule_time");
    const timezoneSetting = await db.getSetting("schedule_timezone");
    const enabledSetting = await db.getSetting("standalone_tweet_enabled");

    const timeStr = timeSetting?.value || "07:00";
    const timezone = timezoneSetting?.value || "America/Los_Angeles";
    const [hourStr, minuteStr] = timeStr.split(":");
    const hour = parseInt(hourStr) || 7;
    const minute = parseInt(minuteStr) || 0;

    // Stop existing task
    if (currentTask) {
      currentTask.stop();
      currentTask = null;
      currentCronExpression = null;
    }

    if (enabledSetting?.value !== "true") {
      console.log("[Standalone Tweet Scheduler] Disabled. No task scheduled.");
      return;
    }

    const cronExpr = `0 ${minute} ${hour} * * *`;
    if (!cron.validate(cronExpr)) {
      console.error(`[Standalone Tweet Scheduler] Invalid cron expression: ${cronExpr}`);
      return;
    }

    currentTask = cron.schedule(cronExpr, () => {
      console.log(`[Standalone Tweet Scheduler] Cron triggered at ${new Date().toISOString()}`);
      runStandaloneTweetGeneration().catch(e => console.error("[Standalone Tweet Scheduler] Run error:", e));
    }, { timezone });

    currentCronExpression = cronExpr;
    nextRunTime = calculateNextRun(hour, minute, timezone);
    console.log(`[Standalone Tweet Scheduler] Scheduled: ${cronExpr} (${timezone})`);
    console.log(`[Standalone Tweet Scheduler] Next run: ${nextRunTime}`);
  } catch (error) {
    console.error("[Standalone Tweet Scheduler] Failed to initialize:", error);
  }
}

export async function refreshStandaloneTweetScheduler(): Promise<ReturnType<typeof getStandaloneTweetSchedulerStatus>> {
  await initStandaloneTweetScheduler();
  return getStandaloneTweetSchedulerStatus();
}

export function getStandaloneTweetSchedulerStatus() {
  return {
    isScheduled: currentTask !== null,
    cronExpression: currentCronExpression,
    nextRun: nextRunTime,
    lastRun: lastRunResult,
    isRunning,
  };
}

export async function triggerStandaloneTweetGenerationNow(): Promise<void> {
  return runStandaloneTweetGeneration();
}
