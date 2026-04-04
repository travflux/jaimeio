import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User, LicenseUser } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyLicenseUserToken, TENANT_COOKIE_NAME } from "../auth";
import { parse as parseCookieHeader } from "cookie";
import { getDb } from "../db";
import { licenseUsers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  tenantUser: (Pick<LicenseUser, "id" | "licenseId" | "email" | "name" | "role">) | null;
  licenseId: number | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let tenantUser: TrpcContext["tenantUser"] = null;
  let licenseId: number | null = null;

  // Try admin auth first
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  // Try tenant user auth (from tenant cookie)
  try {
    const cookies = opts.req.headers.cookie ? parseCookieHeader(opts.req.headers.cookie) : {};
    const tenantToken = cookies[TENANT_COOKIE_NAME];
    if (tenantToken) {
      const payload = await verifyLicenseUserToken(tenantToken);
      if (payload) {
        const db = await getDb();
        const [freshUser] = await db
          .select({
            id: licenseUsers.id,
            licenseId: licenseUsers.licenseId,
            email: licenseUsers.email,
            name: licenseUsers.name,
            role: licenseUsers.role,
          })
          .from(licenseUsers)
          .where(eq(licenseUsers.id, payload.userId))
          .limit(1);
        if (freshUser) {
          tenantUser = freshUser;
          licenseId = freshUser.licenseId;
        }
      }
    }
  } catch {
    tenantUser = null;
  }

  // Resolve licenseId from subdomain if not already set from tenant cookie
  if (!licenseId) {
    try {
      const hostname = opts.req.hostname || (opts.req.headers.host || "").split(":")[0] || "";
      const subdomain = hostname.split(".")[0];
      if (subdomain && subdomain !== "app" && subdomain !== "staging" && subdomain !== "www" && subdomain !== "localhost" && subdomain !== "127") {
        const { getLicenseBySubdomain } = await import("../db");
        const license = await getLicenseBySubdomain(subdomain);
        if (license) licenseId = license.id;
      }
    } catch {}
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    tenantUser,
    licenseId,
  };
}
