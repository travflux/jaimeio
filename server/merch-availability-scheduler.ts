/**
 * Merch Availability Scheduler
 *
 * Runs daily at 3:00 AM ET to verify all active Printify products still exist.
 * If a product is missing from Printify, it is automatically paused
 * (merch_product_active_{type} set to "false") and the CEO Dashboard is notified.
 *
 * Settings consumed:
 *   merch_sidebar_enabled          — master on/off switch (skips if false)
 *   merch_printify_api_token       — Printify API bearer token
 *   merch_printify_shop_id         — Printify shop ID
 *   merch_product_id_{type}        — Printify product ID per type
 *   merch_product_active_{type}    — active flag per type (written by this job)
 *   merch_last_availability_check  — ISO timestamp of last run (written by this job)
 *   schedule_timezone              — IANA timezone (default: America/New_York)
 */
import cron from "node-cron";
import * as db from "./db";

const ALL_PRODUCT_TYPES = ["mug", "shirt", "poster", "case", "canvas", "tote", "hoodie", "mousepad", "candle", "cards"] as const;
type ProductType = typeof ALL_PRODUCT_TYPES[number];

let currentTask: ReturnType<typeof cron.schedule> | null = null;
let lastRunResult: { time: string; status: string; message: string; paused?: string[] } | null = null;
let isRunning = false;

// ─── Core check function ─────────────────────────────────────────────────────
export async function runAvailabilityCheck(): Promise<{ success: boolean; paused: string[]; message: string }> {
  if (isRunning) {
    return { success: false, paused: [], message: "Check already in progress" };
  }
  isRunning = true;
  const startedAt = new Date().toISOString();
  console.log(`[MerchAvailability] Starting availability check at ${startedAt}`);

  try {
    const tokenSetting = await db.getSetting("merch_printify_api_token");
    const shopSetting = await db.getSetting("merch_printify_shop_id");
    const token = tokenSetting?.value;
    const shopId = shopSetting?.value;

    if (!token || !shopId) {
      const msg = "Printify credentials not configured — skipping availability check";
      console.log(`[MerchAvailability] ${msg}`);
      await db.setSetting("merch_last_availability_check", startedAt);
      lastRunResult = { time: startedAt, status: "skipped", message: msg };
      return { success: false, paused: [], message: msg };
    }

    // Fetch live products from Printify
    const res = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json`, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": `${process.env.VITE_APP_TITLE || "satire-engine"}/1.0` },
    });
    if (!res.ok) {
      const msg = `Printify API error ${res.status}`;
      console.error(`[MerchAvailability] ${msg}`);
      lastRunResult = { time: startedAt, status: "error", message: msg };
      return { success: false, paused: [], message: msg };
    }

    const data = await res.json() as { data: { id: string }[] };
    const liveIds = new Set((data.data ?? []).map((p: { id: string }) => p.id));

    const paused: string[] = [];
    for (const type of ALL_PRODUCT_TYPES) {
      const productIdSetting = await db.getSetting(`merch_product_id_${type}`);
      const activeSetting = await db.getSetting(`merch_product_active_${type}`);
      const productId = productIdSetting?.value;
      const isActive = activeSetting?.value !== "false";

      if (!productId || !isActive) continue; // not configured or already paused

      if (!liveIds.has(productId)) {
        console.log(`[MerchAvailability] Product ${type} (${productId}) not found in Printify — pausing`);
        await db.setSetting(`merch_product_active_${type}`, "false");
        paused.push(type);
      }
    }

    // Write timestamp
    await db.setSetting("merch_last_availability_check", startedAt);

    const message = paused.length > 0
      ? `Paused ${paused.length} product(s): ${paused.join(", ")}`
      : `All active products verified (${liveIds.size} in Printify)`;

    console.log(`[MerchAvailability] Done — ${message}`);
    lastRunResult = { time: startedAt, status: "ok", message, paused };

    // Notify CEO if any products were paused
    if (paused.length > 0) {
      try {
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({
          title: `Merch Store: ${paused.length} product(s) auto-paused`,
          content: `Daily availability check found ${paused.length} product(s) missing from Printify and paused them automatically.\n\nPaused: ${paused.join(", ")}\n\nCheck Admin → Settings → Merch Store → Sync from Printify to investigate.`,
        });
      } catch (notifyErr) {
        console.warn("[MerchAvailability] Failed to send owner notification:", notifyErr);
      }
    }

    return { success: true, paused, message };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[MerchAvailability] Error:`, err);
    lastRunResult = { time: startedAt, status: "error", message: msg };
    return { success: false, paused: [], message: msg };
  } finally {
    isRunning = false;
  }
}

// ─── Scheduler init ──────────────────────────────────────────────────────────
export function initMerchAvailabilityScheduler(): void {
  // Stop any existing task
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }

  // Run daily at 3:00 AM ET (08:00 UTC)
  // Uses node-cron: second minute hour day month weekday
  const cronExpression = "0 0 8 * * *"; // 3am ET = 8am UTC

  currentTask = cron.schedule(cronExpression, async () => {
    console.log("[MerchAvailability Scheduler] Cron triggered");
    await runAvailabilityCheck();
  }, {
    timezone: "America/New_York",
  });

  console.log("[MerchAvailability Scheduler] Initialized — runs daily at 3:00 AM ET");
}

export function getMerchAvailabilitySchedulerStatus() {
  return {
    running: isRunning,
    lastRun: lastRunResult,
    nextRun: "Daily at 3:00 AM ET",
  };
}
