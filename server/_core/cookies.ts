import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

/**
 * Returns cookie options with cross-subdomain support.
 * Sets domain to `.getjaime.io` so cookies are shared across all subdomains
 * (app.getjaime.io, wilderblueprint.getjaime.io, nikijames.getjaime.io, etc.)
 */
export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname;

  // For *.getjaime.io subdomains, set domain to .getjaime.io for cross-subdomain cookies
  let domain: string | undefined;
  if (hostname.endsWith(".getjaime.io") || hostname === "getjaime.io") {
    domain = ".getjaime.io";
  }
  // For localhost / IP addresses, don't set a domain (browser handles it)

  return {
    ...(domain ? { domain } : {}),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecureRequest(req),
  };
}
