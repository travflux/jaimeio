/**
 * Branding Asset Upload — Express route for uploading logo/sponsor images to S3.
 *
 * POST /api/branding/upload
 *   - Requires admin authentication (session cookie)
 *   - Accepts multipart/form-data with a single "file" field
 *   - Query param: type=logo|og_image|sponsor_bar|article_sponsor
 *   - Returns { url: string } — the public S3 URL
 */

import type { Express, Request, Response } from "express";
import multer from "multer";
import crypto from "crypto";
import { storagePut } from "./storage";
import { sdk } from "./_core/sdk";

const ALLOWED_TYPES = ["logo", "og_image", "sponsor_bar", "article_sponsor"] as const;

// Accept images up to 5MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/gif", "image/x-icon", "image/vnd.microsoft.icon"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: PNG, JPEG, SVG, WebP, GIF, ICO`));
    }
  },
});

export function registerBrandingUpload(app: Express) {
  app.post(
    "/api/branding/upload",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        // Authenticate — must be admin
        const user = await sdk.authenticateRequest(req);
        if (!user || user.role !== "admin") {
          res.status(403).json({ error: "Admin access required" });
          return;
        }

        const file = req.file;
        if (!file) {
          res.status(400).json({ error: "No file provided" });
          return;
        }

        const assetType = (req.query.type as string) || "logo";
        if (!(ALLOWED_TYPES as readonly string[]).includes(assetType)) {
          res.status(400).json({ error: `Invalid asset type. Must be one of: ${ALLOWED_TYPES.join(", ")}` });
          return;
        }

        // Generate a unique key to prevent enumeration
        const ext = getExtension(file.mimetype);
        const hash = crypto.randomBytes(8).toString("hex");
        const key = `branding/${assetType}-${hash}${ext}`;

        const { url } = await storagePut(key, file.buffer, file.mimetype);

        console.log(`[Branding] Uploaded ${assetType} → ${url}`);
        res.json({ url });
      } catch (err: any) {
        // Suppress expected auth errors (user not logged in yet) — these are normal preflights
        const isAuthError = err.message?.includes("Invalid session") || err.message?.includes("Unauthorized") || err.message?.includes("Not authenticated");
        if (!isAuthError) {
          console.error("[Branding Upload] Error:", err.message);
        }
        if (err.message?.includes("Unsupported file type")) {
          res.status(400).json({ error: err.message });
        } else if (err.message?.includes("File too large")) {
          res.status(413).json({ error: "File too large. Maximum size is 5MB." });
        } else if (isAuthError) {
          res.status(401).json({ error: "Authentication required" });
        } else {
          res.status(500).json({ error: "Upload failed" });
        }
      }
    }
  );
}

function getExtension(mime: string): string {
  const map: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/x-icon": ".ico",
    "image/vnd.microsoft.icon": ".ico",
  };
  return map[mime] || ".png";
}
