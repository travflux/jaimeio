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
          heapUsed: Math.floor(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.floor(memoryUsage.heapTotal / 1024 / 1024),
          rss: Math.floor(memoryUsage.rss / 1024 / 1024),
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
      return { success: delivered } as const;
    }),

  deployInfo: publicProcedure.query(async () => {
    const { getCurrentVersion } = await import("../version-manager");
    const fs = await import("fs");
    let commitSha = process.env.COMMIT_SHA || "unknown";
    try {
      const head = fs.readFileSync("/app/.git/HEAD", "utf8").trim();
      if (head.startsWith("ref:")) {
        const ref = head.replace("ref: ", "");
        commitSha = fs.readFileSync("/app/.git/" + ref, "utf8").trim().substring(0, 8);
      } else {
        commitSha = head.substring(0, 8);
      }
    } catch { /* use env or unknown */ }
    return {
      version: getCurrentVersion(),
      environment: process.env.NODE_ENV === "production" ? "production" : "staging",
      commitSha,
      deployTimestamp: new Date().toISOString(),
    };
  }),

  testS3Connection: adminProcedure.mutation(async () => {
    try {
      const { storagePut, storageDelete } = await import("../storage");
      const key = "test/connection-check-" + Date.now() + ".txt";
      const result = await storagePut(key, "JAIME.IO S3 connection test", "text/plain");
      await storageDelete(key);
      return { success: true, message: "S3 connection verified", url: result.url };
    } catch (e: any) {
      return { success: false, message: e.message || "S3 connection failed" };
    }
  }),

  testLlmConnection: adminProcedure.mutation(async () => {
    try {
      const { invokeLLM } = await import("./llm");
      const result = await invokeLLM({
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        maxTokens: 10,
      });
      const text = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
      return { success: true, message: "LLM connection verified", response: text.substring(0, 100) };
    } catch (e: any) {
      return { success: false, message: e.message?.substring(0, 200) || "LLM connection failed" };
    }
  }),

  promoteToProduction: adminProcedure.mutation(async () => {
    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);
      const { getCurrentVersion, getVersionHistory } = await import("../version-manager");
      
      const currentVersion = getCurrentVersion();
      
      // Get changelog from git log
      let changelog: string[] = [];
      try {
        const { stdout } = await execAsync("cd /var/www/jaimeio && git log --oneline staging ^main 2>/dev/null || echo 'No changes'");
        changelog = stdout.trim().split("\n").filter(Boolean).map(l => l.trim());
      } catch { changelog = ["Promote staging to production"]; }
      
      // Merge staging into main
      try {
        await execAsync(`cd /var/www/jaimeio && git checkout main && git merge staging --no-ff -m "Promote staging to production v${currentVersion}" && git push origin main 2>/dev/null || true`);
      } catch (e: any) {
        return { success: false, error: "Git merge failed: " + (e.message || "").substring(0, 200), newVersion: currentVersion, changelog, promoted: false };
      }
      
      // Switch back to staging
      try { await execAsync("cd /var/www/jaimeio && git checkout staging"); } catch {}
      
      return { success: true, newVersion: currentVersion, changelog, promoted: true };
    } catch (e: any) {
      return { success: false, error: e.message?.substring(0, 200) || "Unknown error", newVersion: "", changelog: [], promoted: false };
    }
  }),


  getDeployLog: adminProcedure.query(async () => {
    const fs = await import("fs");
    try {
      const log = fs.readFileSync("/var/www/jaimeio/deploy-log.txt", "utf8");
      return log.trim().split("\n").slice(-20);
    } catch { return []; }
  }),

});
