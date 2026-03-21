/**
 * Stripe Webhook Handler
 *
 * POST /api/webhooks/stripe
 *
 * Handles: checkout.session.completed, invoice.paid, payment_intent.succeeded
 *
 * Attribution flow:
 *   1. session_id + visitor_id are stored in Stripe metadata at checkout time
 *   2. Webhook extracts them and looks up the visitor_sessions record
 *   3. Inserts into revenue_events with full channel attribution
 *
 * Gracefully no-ops if STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET are not configured.
 */

import type { Express, Request, Response } from "express";
import { insertRevenueEvent, recordConversionEvent, updateSessionConversionFlag } from "./attribution";

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

export function registerStripeWebhookRoute(app: Express): void {
  // Raw body needed for Stripe signature verification
  app.post(
    "/api/webhooks/stripe",
    // Use express.raw() for this route only — must be registered before express.json()
    // In practice the core index.ts registers json() globally, so we read rawBody from req
    async (req: Request, res: Response) => {
      // Graceful no-op if Stripe is not configured
      if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
        console.log("[Stripe Webhook] Not configured — skipping");
        res.json({ received: true, status: "not_configured" });
        return;
      }

      try {
        // Dynamically import stripe to avoid hard dependency when not configured
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" as any });

        // Verify webhook signature
        const sig = req.headers["stripe-signature"] as string;
        const rawBody = (req as any).rawBody ?? JSON.stringify(req.body);

        let event: any;
        try {
          event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
        } catch (err: any) {
          console.error("[Stripe Webhook] Signature verification failed:", err.message);
          res.status(400).json({ error: "Invalid signature" });
          return;
        }

        await handleStripeEvent(event);
        res.json({ received: true });
      } catch (err) {
        console.error("[Stripe Webhook] Error:", err);
        res.status(500).json({ error: "Webhook handler failed" });
      }
    }
  );
}

async function handleStripeEvent(event: any): Promise<void> {
  const { type, data } = event;
  const obj = data.object;

  switch (type) {
    case "checkout.session.completed": {
      const sessionId = obj.metadata?.hambry_session_id as string | undefined;
      const visitorId = obj.metadata?.hambry_visitor_id as string | undefined;
      const amountCents = obj.amount_total ?? 0;
      const currency = obj.currency ?? "usd";

      await insertRevenueEvent({
        stripeEventId: event.id,
        stripeCustomerId: obj.customer as string | undefined,
        stripePaymentIntentId: obj.payment_intent as string | undefined,
        amountCents,
        currency,
        revenueType: "one_time",
        description: "Stripe checkout completed",
        sessionId: sessionId ?? null,
        visitorId: visitorId ?? null,
      });

      if (sessionId) {
        await recordConversionEvent({
          sessionId,
          visitorId,
          eventType: "stripe_payment_complete",
          eventValueCents: amountCents,
          eventMetadata: { stripeEventId: event.id },
        }).catch(() => {});
        await updateSessionConversionFlag(sessionId, "stripePurchase").catch(() => {});
      }
      break;
    }

    case "invoice.paid": {
      const customerId = obj.customer as string | undefined;
      const amountCents = obj.amount_paid ?? 0;
      const currency = obj.currency ?? "usd";
      const sessionId = obj.metadata?.hambry_session_id as string | undefined;
      const visitorId = obj.metadata?.hambry_visitor_id as string | undefined;

      await insertRevenueEvent({
        stripeEventId: event.id,
        stripeCustomerId: customerId,
        amountCents,
        currency,
        revenueType: "subscription",
        description: "Stripe subscription renewal",
        sessionId: sessionId ?? null,
        visitorId: visitorId ?? null,
      });
      break;
    }

    case "payment_intent.succeeded": {
      const amountCents = obj.amount ?? 0;
      const currency = obj.currency ?? "usd";
      const sessionId = obj.metadata?.hambry_session_id as string | undefined;
      const visitorId = obj.metadata?.hambry_visitor_id as string | undefined;

      await insertRevenueEvent({
        stripeEventId: event.id,
        stripeCustomerId: obj.customer as string | undefined,
        stripePaymentIntentId: obj.id as string,
        amountCents,
        currency,
        revenueType: "one_time",
        description: "Stripe payment intent succeeded",
        sessionId: sessionId ?? null,
        visitorId: visitorId ?? null,
      });
      break;
    }

    default:
      // Unhandled event type — no-op
      console.log(`[Stripe Webhook] Unhandled event type: ${type}`);
  }
}
