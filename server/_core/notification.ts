import { TRPCError } from "@trpc/server";

export type NotificationPayload = {
  title: string;
  content: string;
};

/**
 * Send a notification. Currently a no-op — push notifications are not configured.
 * Log the notification for debugging.
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  console.log("[Notification]", payload.title, "-", payload.content.substring(0, 100));
  return false;
}
