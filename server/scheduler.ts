/**
 * Workflow Scheduler — runs inside the Satire Engine server process.
 * 
 * Reads schedule settings from the database and uses node-cron to
 * trigger the TypeScript workflow engine at the configured times and days.
 * 
 * Supports up to 4 runs per day (e.g., 5 AM, 11 AM, 5 PM, 10 PM) to hit
 * the 50 articles/day target with ~13 articles per run.
 * 
 * Settings consumed:
 *   workflow_enabled        — master on/off switch
 *   schedule_runs_per_day   — number of runs per day (1-4, default 4)
 *   schedule_hour           — hour for run 1 (0-23), in the user's timezone
 *   schedule_minute         — minute for run 1 (0-59)
 *   schedule_run2_hour      — hour for run 2 (only if runs_per_day >= 2)
 *   schedule_run2_minute    — minute for run 2
 *   schedule_run3_hour      — hour for run 3 (only if runs_per_day >= 3)
 *   schedule_run3_minute    — minute for run 3
 *   schedule_run4_hour      — hour for run 4 (only if runs_per_day >= 4)
 *   schedule_run4_minute    — minute for run 4
 *   schedule_days           — comma-separated days: mon,tue,wed,thu,fri,sat,sun
 *   schedule_timezone       — IANA timezone string (default: America/Los_Angeles)
 *
 * Persisted state (in workflow_settings, category "_internal"):
 *   _last_workflow_run — ISO timestamp of the last workflow run attempt,
 *                        written BEFORE the workflow starts so that rapid
 *                        server restarts cannot trigger duplicate runs within
 *                        the 10-minute cooldown window.
 */
import cron from "node-cron";
import * as db from "./db";
import { runFullPipeline } from "./workflow";
import { addAmazonSettings } from "./migrations/add-amazon-settings";
import { expireOldCandidates } from "./sources/rss-bridge";
import { scoreUnscoredCandidates, decayStaleScores } from "./candidate-scoring";

interface ScheduledTask {
  task: ReturnType<typeof cron.schedule>;
  cronExpr: string;
  runIndex: number; // 1, 2, 3, or 4
}

let scheduledTasks: ScheduledTask[] = [];
let lastRunResult: { time: string; status: string; message: string } | null = null;
let nextRunTime: string | null = null;
let isRunning = false;

// ─── Persisted last-run helpers ──────────────────────────────────────────────

const LAST_RUN_KEY = "_last_workflow_run";

/** Read the last run timestamp from the database. */
async function loadLastRunTime(): Promise<string | null> {
  try {
    const setting = await db.getSetting(LAST_RUN_KEY);
    return setting?.value || null;
  } catch {
    return null;
  }
}

/** Save the last run timestamp to the database. */
async function saveLastRunTime(isoTime: string): Promise<void> {
  try {
    await db.upsertSetting({
      key: LAST_RUN_KEY,
      value: isoTime,
      label: "Last Workflow Run",
      description: "Internal: ISO timestamp of the last workflow execution. Do not edit.",
      category: "_internal",
      type: "string",
    });
  } catch (e) {
    console.warn("[Scheduler] Could not persist last run time:", e);
  }
}

// ─── Day / cron helpers ──────────────────────────────────────────────────────

function daysToCron(days: string): string {
  const dayMap: Record<string, string> = {
    sun: "0", mon: "1", tue: "2", wed: "3", thu: "4", fri: "5", sat: "6",
  };
  const dayList = days.split(",").map(d => d.trim().toLowerCase());
  const cronDays = dayList.map(d => dayMap[d]).filter(Boolean);
  return cronDays.length > 0 ? cronDays.join(",") : "1,2,3,4,5";
}

function buildCronExpression(hour: number, minute: number, days: string): string {
  const cronDays = daysToCron(days);
  return `0 ${minute} ${hour} * * ${cronDays}`;
}

function formatTime12h(hour: number, minute: number): string {
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:${String(minute).padStart(2, "0")} ${ampm}`;
}

function calculateNextRun(
  runs: Array<{ hour: number; minute: number }>,
  days: string,
  timezone: string
): string {
  const dayMap: Record<string, number> = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  };
  const activeDays = days.split(",").map(d => dayMap[d.trim().toLowerCase()]).filter(d => d !== undefined);

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  for (let i = 0; i < 8; i++) {
    const candidate = new Date(now.getTime() + i * 86400000);
    const dayOfWeek = candidate.getDay();

    if (!activeDays.includes(dayOfWeek)) continue;

    const parts = formatter.formatToParts(candidate);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || "0";
    const candidateHour = parseInt(getPart("hour"));
    const candidateMinute = parseInt(getPart("minute"));

    // Find the next run time on this day
    for (const run of runs) {
      if (i === 0) {
        // Today: only future times
        const currentMinutes = candidateHour * 60 + candidateMinute;
        const runMinutes = run.hour * 60 + run.minute;
        if (currentMinutes >= runMinutes) continue;
      }

      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${dayNames[dayOfWeek]}, ${monthNames[candidate.getMonth()]} ${candidate.getDate()} at ${formatTime12h(run.hour, run.minute)} ${timezone}`;
    }
  }

  return "No upcoming run scheduled";
}

// ─── Timezone date helper ────────────────────────────────────────────────────

/** Get today's date string (YYYY-MM-DD) in the given timezone. */
function getTodayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

/** Convert an ISO timestamp to a date string in the given timezone. */
function toDateInTimezone(isoTime: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date(isoTime));
}

// ─── Workflow execution ──────────────────────────────────────────────────────

async function runWorkflow(): Promise<{ status: string; message: string }> {
  if (isRunning) {
    return { status: "skipped", message: "Workflow is already running" };
  }

  // Cooldown check: prevent running within 10 minutes of last run
  const persistedLastRun = await loadLastRunTime();
  if (persistedLastRun) {
    const lastRunTime = new Date(persistedLastRun).getTime();
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    if (now - lastRunTime < tenMinutes) {
      const minutesAgo = Math.floor((now - lastRunTime) / 60000);
      return { status: "skipped", message: `Workflow ran ${minutesAgo} minute(s) ago. Please wait at least 10 minutes between runs.` };
    }
  }

  isRunning = true;
  const startTime = new Date().toISOString();
  console.log(`[Scheduler] Starting workflow at ${startTime}`);

  // Persist the run time IMMEDIATELY — before doing any work — so that
  // a rapid server restart won't trigger a second run within the cooldown window.
  await saveLastRunTime(startTime);

  try {
    // v4.7.1: Setup gate — skip until operator has completed the Setup Wizard
    const setupCompleteSetting = await db.getSetting("setup_complete");
    if (!setupCompleteSetting || setupCompleteSetting.value !== "true") {
      console.log("[Scheduler] Workflow skipped — Setup Wizard not yet completed. Set setup_complete=true to enable.");
      const result = { status: "skipped", message: "Workflow skipped — Setup Wizard not yet completed" };
      lastRunResult = { time: startTime, ...result };
      isRunning = false;
      return result;
    }

    const enabledSetting = await db.getSetting("workflow_enabled");
    if (enabledSetting && enabledSetting.value !== "true") {
      const result = { status: "skipped", message: "Workflow is disabled in settings" };
      lastRunResult = { time: startTime, ...result };
      isRunning = false;
      return result;
    }

    const workflowResult = await runFullPipeline();

    const result = {
      status: workflowResult.status === "success" ? "success" : "warning",
      message: workflowResult.message || `Workflow completed at ${new Date().toISOString()}. ${workflowResult.articlesGenerated || 0} articles generated, ${workflowResult.articlesImported || 0} imported.`,
    };

    lastRunResult = { time: startTime, ...result };
    console.log(`[Scheduler] Workflow finished: ${result.status} — ${result.message}`);
    isRunning = false;
    return result;

  } catch (error: any) {
    const result = {
      status: "error",
      message: `Workflow failed: ${error.message?.substring(0, 200) || "Unknown error"}`,
    };
    lastRunResult = { time: startTime, ...result };
    console.error(`[Scheduler] Workflow error:`, error.message?.substring(0, 500));
    isRunning = false;
    return result;
  }
}

// ─── Missed-run detection ────────────────────────────────────────────────────

/**
 * Check if any scheduled run was missed today and execute if needed.
 * Uses the persisted last-run timestamp from the database so that
 * server restarts do NOT cause duplicate runs within the cooldown window.
 */
async function checkMissedRun(
  runs: Array<{ hour: number; minute: number }>,
  days: string,
  timezone: string
): Promise<void> {
  const persistedLastRun = await loadLastRunTime();
  const todayStr = getTodayInTimezone(timezone);

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const currentHour = parseInt(parts.find(p => p.type === "hour")?.value || "0");
  const currentMinute = parseInt(parts.find(p => p.type === "minute")?.value || "0");
  const dayOfWeek = now.getDay();

  const dayMap: Record<string, number> = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  };
  const activeDays = days.split(",").map(d => dayMap[d.trim().toLowerCase()]).filter(d => d !== undefined);

  if (!activeDays.includes(dayOfWeek)) return;

  const currentMinutes = currentHour * 60 + currentMinute;

  // Find the latest run time that has passed today
  let latestPassedRun: { hour: number; minute: number } | null = null;
  for (const run of runs) {
    const runMinutes = run.hour * 60 + run.minute;
    if (currentMinutes > runMinutes) {
      latestPassedRun = run;
    }
  }

  if (!latestPassedRun) return;

  // If we already ran today, check if it was after the latest passed run
  if (persistedLastRun) {
    const lastRunDateInTz = toDateInTimezone(persistedLastRun, timezone);
    if (lastRunDateInTz === todayStr) {
      const lastRunFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const lastRunParts = lastRunFormatter.formatToParts(new Date(persistedLastRun));
      const lastRunHour = parseInt(lastRunParts.find(p => p.type === "hour")?.value || "0");
      const lastRunMinute = parseInt(lastRunParts.find(p => p.type === "minute")?.value || "0");
      const lastRunMinutes = lastRunHour * 60 + lastRunMinute;
      const latestPassedMinutes = latestPassedRun.hour * 60 + latestPassedRun.minute;

      if (lastRunMinutes >= latestPassedMinutes) {
        console.log(`[Scheduler] Workflow already ran today after latest scheduled time (${persistedLastRun}). Skipping missed-run check.`);
        if (!lastRunResult) {
          lastRunResult = { time: persistedLastRun, status: "success", message: "Restored from previous run" };
        }
        return;
      }
    }
  }

  console.log(`[Scheduler] Missed run detected (latest scheduled ${formatTime12h(latestPassedRun.hour, latestPassedRun.minute)}, now ${formatTime12h(currentHour, currentMinute)}). Running now...`);
  await runWorkflow();
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function initScheduler() {
  try {
    // Initialize Amazon settings on startup
    await addAmazonSettings();

    const hourSetting = await db.getSetting("schedule_hour");
    const minuteSetting = await db.getSetting("schedule_minute");
    const daysSetting = await db.getSetting("schedule_days");
    const timezoneSetting = await db.getSetting("schedule_timezone");
    const enabledSetting = await db.getSetting("workflow_enabled");
    const runsPerDaySetting = await db.getSetting("schedule_runs_per_day");
    const run2HourSetting = await db.getSetting("schedule_run2_hour");
    const run2MinuteSetting = await db.getSetting("schedule_run2_minute");
     const run3HourSetting = await db.getSetting("schedule_run3_hour");
    const run3MinuteSetting = await db.getSetting("schedule_run3_minute");
    const run4HourSetting = await db.getSetting("schedule_run4_hour");
    const run4MinuteSetting = await db.getSetting("schedule_run4_minute");
    const hour1 = hourSetting ? parseInt(hourSetting.value) : 5;
    const minute1 = minuteSetting ? parseInt(minuteSetting.value) : 0;
    const days = daysSetting?.value || "mon,tue,wed,thu,fri";
    const timezone = timezoneSetting?.value || "America/Los_Angeles";
    const enabled = enabledSetting ? enabledSetting.value === "true" : true;
    const runsPerDay = runsPerDaySetting ? Math.min(4, Math.max(1, parseInt(runsPerDaySetting.value) || 1)) : 1;
    const hour2 = run2HourSetting ? parseInt(run2HourSetting.value) : 11;
    const minute2 = run2MinuteSetting ? parseInt(run2MinuteSetting.value) : 0;
    const hour3 = run3HourSetting ? parseInt(run3HourSetting.value) : 17;
    const minute3 = run3MinuteSetting ? parseInt(run3MinuteSetting.value) : 0;
    const hour4 = run4HourSetting ? parseInt(run4HourSetting.value) : 22;
    const minute4 = run4MinuteSetting ? parseInt(run4MinuteSetting.value) : 0;
    // Build list of active runs
    const runs: Array<{ hour: number; minute: number; index: number }> = [
      { hour: hour1, minute: minute1, index: 1 },
    ];
    if (runsPerDay >= 2) runs.push({ hour: hour2, minute: minute2, index: 2 });
    if (runsPerDay >= 3) runs.push({ hour: hour3, minute: minute3, index: 3 });
    if (runsPerDay >= 4) runs.push({ hour: hour4, minute: minute4, index: 4 });

    // Sort runs by time
    runs.sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));

    // Build cron expressions for all runs
    const newCronExprs = runs.map(r => buildCronExpression(r.hour, r.minute, days));
    const currentCronExprs = scheduledTasks.map(t => t.cronExpr);

    // Check if anything changed
    const hasChanged = JSON.stringify(newCronExprs.sort()) !== JSON.stringify(currentCronExprs.sort()) || !enabled;

    if (!hasChanged && scheduledTasks.length > 0) {
      console.log(`[Scheduler] No change in schedule, keeping current tasks.`);
      return;
    }

    // Stop all existing tasks
    for (const t of scheduledTasks) {
      t.task.stop();
    }
    scheduledTasks = [];
    console.log("[Scheduler] Stopped previous scheduled tasks.");

    if (!enabled) {
      console.log("[Scheduler] Workflow is disabled. No tasks scheduled.");
      nextRunTime = null;
      return;
    }

    // Schedule each run
    for (const run of runs) {
      const cronExpr = buildCronExpression(run.hour, run.minute, days);
      if (!cron.validate(cronExpr)) {
        console.error(`[Scheduler] Invalid cron expression for run ${run.index}: ${cronExpr}`);
        continue;
      }

      const task = cron.schedule(cronExpr, () => {
        console.log(`[Scheduler] Cron triggered (run ${run.index}) at ${new Date().toISOString()}`);
        runWorkflow().catch(e => console.error("[Scheduler] Run error:", e));
      }, { timezone });

      scheduledTasks.push({ task, cronExpr, runIndex: run.index });
      console.log(`[Scheduler] Scheduled run ${run.index}: ${cronExpr} at ${formatTime12h(run.hour, run.minute)} (${timezone})`);
    }

    nextRunTime = calculateNextRun(runs.map(r => ({ hour: r.hour, minute: r.minute })), days, timezone);
    console.log(`[Scheduler] Next run: ${nextRunTime}`);
    console.log(`[Scheduler] Active days: ${days}`);
    console.log(`[Scheduler] Total runs per day: ${runs.length}`);

    await checkMissedRun(runs.map(r => ({ hour: r.hour, minute: r.minute })), days, timezone);

  } catch (error) {
    console.error("[Scheduler] Failed to initialize:", error);
  }

  // v4.0: Hourly cron to expire stale selector_candidates
  // Runs at minute 30 of every hour, every day
  if (!cron.validate("30 * * * *")) return;
  cron.schedule("30 * * * *", async () => {
    try {
      const expired = await expireOldCandidates();
      if (expired > 0) console.log(`[Scheduler] [v4] Expired ${expired} stale selector candidates`);
    } catch (err: any) {
      console.log(`[Scheduler] [v4] Candidate expiry error: ${err.message}`);
    }
  });

  // v4.5: Score unscored candidates every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      const scored = await scoreUnscoredCandidates();
      if (scored > 0) console.log(`[Scheduler] [v4.5] Scored ${scored} new candidates`);
    } catch (err: any) {
      console.warn(`[Scheduler] [v4.5] Scoring error: ${err.message}`);
    }
  });
  // v4.5: Decay stale scores every 3 hours (re-score candidates whose scores are old)
  cron.schedule("0 */3 * * *", async () => {
    try {
      const decayed = await decayStaleScores(3);
      if (decayed > 0) console.log(`[Scheduler] [v4.5] Re-scored (decayed) ${decayed} stale candidates`);
    } catch (err: any) {
      console.warn(`[Scheduler] [v4.5] Score decay error: ${err.message}`);
    }
  });
  // v4.0: Social listener crons — X and Reddit every 30 minutes
  // Runs at :00 and :30 of every hour
  cron.schedule("0,30 * * * *", async () => {
    const today = new Date().toISOString().split("T")[0];
    try {
      const { fetchXCandidates } = await import("./sources/x-listener");
      const xInserted = await fetchXCandidates(today);
      if (xInserted > 0) console.log(`[Scheduler] [v4/X] Inserted ${xInserted} new candidates from X`);
    } catch (err: any) {
      console.warn(`[Scheduler] [v4/X] Error: ${err.message}`);
    }
    try {
      const { fetchRedditCandidates } = await import("./sources/reddit-listener");
      const redditInserted = await fetchRedditCandidates(today);
      if (redditInserted > 0) console.log(`[Scheduler] [v4/Reddit] Inserted ${redditInserted} new candidates from Reddit`);
    } catch (err: any) {
      console.warn(`[Scheduler] [v4/Reddit] Error: ${err.message}`);
    }
  });
}

export function getSchedulerStatus() {
  return {
    isScheduled: scheduledTasks.length > 0,
    cronExpression: scheduledTasks.map(t => t.cronExpr).join(" | "),
    cronExpressions: scheduledTasks.map(t => ({ runIndex: t.runIndex, cronExpr: t.cronExpr })),
    nextRun: nextRunTime,
    lastRun: lastRunResult,
    isRunning,
    runsPerDay: scheduledTasks.length,
  };
}

export async function triggerWorkflowNow() {
  return runWorkflow();
}

export async function refreshScheduler() {
  await initScheduler();
  const hourSetting = await db.getSetting("schedule_hour");
  const minuteSetting = await db.getSetting("schedule_minute");
  const daysSetting = await db.getSetting("schedule_days");
  const timezoneSetting = await db.getSetting("schedule_timezone");
  const runsPerDaySetting = await db.getSetting("schedule_runs_per_day");
  const run2HourSetting = await db.getSetting("schedule_run2_hour");
  const run2MinuteSetting = await db.getSetting("schedule_run2_minute");
   const run3HourSetting = await db.getSetting("schedule_run3_hour");
  const run3MinuteSetting = await db.getSetting("schedule_run3_minute");
  const run4HourSetting = await db.getSetting("schedule_run4_hour");
  const run4MinuteSetting = await db.getSetting("schedule_run4_minute");
  const hour1 = hourSetting ? parseInt(hourSetting.value) : 5;
  const minute1 = minuteSetting ? parseInt(minuteSetting.value) : 0;
  const days = daysSetting?.value || "mon,tue,wed,thu,fri";
  const timezone = timezoneSetting?.value || "America/Los_Angeles";
  const runsPerDay = runsPerDaySetting ? Math.min(4, Math.max(1, parseInt(runsPerDaySetting.value) || 1)) : 1;
  const hour2 = run2HourSetting ? parseInt(run2HourSetting.value) : 11;
  const minute2 = run2MinuteSetting ? parseInt(run2MinuteSetting.value) : 0;
  const hour3 = run3HourSetting ? parseInt(run3HourSetting.value) : 17;
  const minute3 = run3MinuteSetting ? parseInt(run3MinuteSetting.value) : 0;
  const hour4 = run4HourSetting ? parseInt(run4HourSetting.value) : 22;
  const minute4 = run4MinuteSetting ? parseInt(run4MinuteSetting.value) : 0;
  const runs: Array<{ hour: number; minute: number }> = [{ hour: hour1, minute: minute1 }];
  if (runsPerDay >= 2) runs.push({ hour: hour2, minute: minute2 });
  if (runsPerDay >= 3) runs.push({ hour: hour3, minute: minute3 });
  if (runsPerDay >= 4) runs.push({ hour: hour4, minute: minute4 });
  runs.sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));

  nextRunTime = calculateNextRun(runs, days, timezone);
  return getSchedulerStatus();
}
