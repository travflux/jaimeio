import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { getBrandSsrData, injectBrandTheme } from "../publicPageSsr";

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

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      let page = await vite.transformIndexHtml(url, template);

      // Inject brand CSS variables for tenant subdomains
      if (!isAdminRoute) {
        try {
          const hostname = req.hostname || req.headers.host?.split(":")[0] || "";
          const brandData = await getBrandSsrData(hostname);
          page = injectBrandTheme(page, brandData);
        } catch { /* non-blocking */ }
      }

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

  // Brand theme injection middleware — runs BEFORE express.static
  // so we can intercept HTML page requests and inject CSS vars
  app.use(async (req, res, next) => {
    // Only intercept HTML page requests (not assets like .js, .css, images)
    const ext = path.extname(req.path);
    if (ext && ext !== ".html") {
      return next();
    }

    // Only intercept navigation requests (not API calls)
    if (req.path.startsWith("/api/") || req.path.startsWith("/trpc/")) {
      return next();
    }

    const isAdminRoute = req.originalUrl.startsWith("/admin") || req.url.startsWith("/admin");
    const indexPath = path.resolve(distPath, "index.html");

    // Only serve index.html for paths that don't map to real files
    // (except root "/" which always needs index.html)
    if (req.path !== "/" && req.path !== "") {
      const filePath = path.resolve(distPath, req.path.replace(/^\//, ""));
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return next(); // Let express.static handle real files
      }
    }

    try {
      let html = fs.readFileSync(indexPath, "utf-8");
      html = html.replace(
        /<title>[^<]*<\/title>/i,
        `<title>Loading...</title>`
      );

      // Inject brand CSS variables for tenant subdomains
      if (!isAdminRoute) {
        try {
          const hostname = req.hostname || req.headers.host?.split(":")[0] || "";
          const brandData = await getBrandSsrData(hostname);
          html = injectBrandTheme(html, brandData);
        } catch (e) {
          console.error("[BrandSSR] Injection error:", e);
        }
      }

      if (isAdminRoute) {
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
      next(); // Fall through to express.static
    }
  });

  app.use(express.static(distPath));
}
