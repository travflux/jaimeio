/**
 * printifyWebhook.ts
 * Printify order webhook receiver.
 * Handles order:created and order:updated events, inserts revenue into revenue_events.
 */

import { Router, Request, Response } from "express";
import crypto from "crypto";
import { insertRevenueEvent } from "./attribution";
import { setSetting } from "./db";

// ─── Signature verification ───────────────────────────────────────────────────

function verifyPrintifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// ─── Event handler ────────────────────────────────────────────────────────────

interface PrintifyOrderEvent {
  type: "order:created" | "order:updated";
  resource: {
    id: string;
    type: "order";
    data: {
      id: string;
      status: string;
      total_price: number;   // in cents
      total_shipping: number;
      total_tax: number;
      currency_code: string;
      metadata?: {
        hambry_session_id?: string;
        hambry_visitor_id?: string;
      };
    };
  };
}

async function handlePrintifyEvent(event: PrintifyOrderEvent): Promise<void> {
  const { type, resource } = event;
  const order = resource.data;

  // Only record revenue on order:created (avoid double-counting on updates)
  if (type !== "order:created") {
    console.log(`[Printify Webhook] Skipping event type: ${type}`);
    return;
  }

  // Skip orders that are cancelled or refunded
  if (["cancelled", "refunded"].includes(order.status)) {
    console.log(`[Printify Webhook] Skipping ${order.status} order: ${order.id}`);
    return;
  }

  // Revenue = total_price (includes shipping and tax from Printify's perspective)
  // In practice, use total_price - total_shipping - total_tax for net merch revenue
  const netCents = Math.max(0, order.total_price - order.total_shipping - order.total_tax);

  const sessionId = order.metadata?.hambry_session_id ?? null;
  const visitorId = order.metadata?.hambry_visitor_id ?? null;

  await insertRevenueEvent({
    stripeEventId: `printify_${order.id}`,
    amountCents: netCents,
    currency: (order.currency_code ?? "usd").toLowerCase(),
    revenueType: "merch",
    description: `Printify order ${order.id}`,
    channel: null as any,
    sessionId,
    visitorId,
  });

  // Update last webhook timestamp
  await setSetting("_attribution_sync_printify_last_webhook", new Date().toISOString(), "_attribution_sync");

  console.log(`[Printify Webhook] Recorded merch revenue $${(netCents / 100).toFixed(2)} for order ${order.id}`);
}

// ─── Express router ───────────────────────────────────────────────────────────

export function registerPrintifyWebhook(app: import("express").Express) {
  app.post(
    "/api/webhooks/printify",
    async (req: Request, res: Response) => {
      const secret = process.env.PRINTIFY_WEBHOOK_SECRET;

      if (!secret) {
        console.log("[Printify Webhook] Not configured — skipping");
        res.json({ received: true, status: "not_configured" });
        return;
      }

      try {
        const signature = req.headers["x-pfy-signature"] as string;
        const rawBody = (req as any).rawBody ?? JSON.stringify(req.body);

        if (signature && !verifyPrintifySignature(rawBody, signature, secret)) {
          console.error("[Printify Webhook] Signature verification failed");
          res.status(400).json({ error: "Invalid signature" });
          return;
        }

        const event = req.body as PrintifyOrderEvent;
        await handlePrintifyEvent(event);
        res.json({ received: true });
      } catch (err) {
        console.error("[Printify Webhook] Error:", err);
        res.status(500).json({ error: "Webhook handler failed" });
      }
    }
  );
}
