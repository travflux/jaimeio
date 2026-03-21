import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { checkDatabaseHealth } from "../db";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative").optional(),
      }).optional()
    )
    .query(async () => {
      const dbHealth = await checkDatabaseHealth();
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      
      return {
        ok: dbHealth.healthy,
        timestamp: Date.now(),
        uptime: Math.floor(uptime),
        database: dbHealth,
        memory: {
          heapUsed: Math.floor(memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.floor(memoryUsage.heapTotal / 1024 / 1024), // MB
          rss: Math.floor(memoryUsage.rss / 1024 / 1024), // MB
        },
      };
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
