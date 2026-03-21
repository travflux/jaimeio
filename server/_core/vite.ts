import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    const isAdminRoute = req.originalUrl.startsWith("/admin") || req.url.startsWith("/admin");

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      let page = await vite.transformIndexHtml(url, template);
      // Block admin routes from search engine indexing
      if (isAdminRoute) {
        page = page.replace(
          /(<meta\s+charset=[^>]+>)/i,
          `$1\n    <meta name="robots" content="noindex, nofollow">`
        );
      }
      const headers: Record<string, string> = { "Content-Type": "text/html" };
      if (isAdminRoute) {
        headers["X-Robots-Tag"] = "noindex, nofollow";
      }
      res.status(200).set(headers).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  // Read and serve the file as text so we can ensure the full SEO title is preserved
  // (the edge layer replaces <title> with VITE_APP_TITLE which strips spaces)
  app.use("*", (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    // Block admin routes from search engine indexing
    const isAdminRoute = req.originalUrl.startsWith("/admin") || req.url.startsWith("/admin");
    try {
      let html = fs.readFileSync(indexPath, "utf-8");
      // Ensure the full SEO title is present regardless of edge layer injection
      html = html.replace(
        /<title>[^<]*<\/title>/i,
        `<title>Loading...</title>`
      );
      if (isAdminRoute) {
        // Inject noindex right after charset meta so it survives any HTML post-processing
        html = html.replace(
          /(<meta\s+charset=[^>]+>)/i,
          `$1\n    <meta name="robots" content="noindex, nofollow">`
        );
      }
      const headers: Record<string, string> = { "Content-Type": "text/html" };
      if (isAdminRoute) {
        headers["X-Robots-Tag"] = "noindex, nofollow";
      }
      res.status(200).set(headers).end(html);
    } catch {
      if (isAdminRoute) {
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
      }
      res.sendFile(indexPath);
    }
  });
}
