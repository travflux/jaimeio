import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { comments } from "../../drizzle/schema";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const commentsRouter = router({
  list: adminProcedure
    .input(z.object({ status: z.string().optional(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      const dbConn = await getDb();
      if (!dbConn) return [];
      if (input.status) {
        return dbConn
          .select()
          .from(comments)
          .where(eq(comments.status, input.status as any))
          .orderBy(desc(comments.createdAt))
          .limit(input.limit ?? 50);
      }
      return dbConn
        .select()
        .from(comments)
        .orderBy(desc(comments.createdAt))
        .limit(input.limit ?? 50);
    }),
  moderate: adminProcedure
    .input(z.object({ id: z.number(), status: z.enum(["approved", "rejected"]) }))
    .mutation(async ({ input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await dbConn
        .update(comments)
        .set({ status: input.status })
        .where(eq(comments.id, input.id));
      return { success: true };
    }),
});
