export const ANALYTICS_SITE_ID = "ldmb2";

const TRACKABLE_EXACT = new Set([
  "/", "/events", "/classes", "/track", "/race-results",
  "/race-results/records", "/sponsors",
]);

const SENSITIVE_SEGMENTS = [
  "admin", "api", "contact", "gallery", "privacy", "booking", "checkout",
  "payment", "login", "account", "contract", "customer", "order", "rental",
  "register", "profile", "upload",
];

export function normalizeAnalyticsPath(input: string): string | null {
  try {
    const path = new URL(input, "https://littledoomudbog.com").pathname
      .replace(/\/{2,}/g, "/")
      .replace(/\/$/, "") || "/";
    return path.length <= 180 ? path.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function isTrackablePath(input: string): boolean {
  const path = normalizeAnalyticsPath(input);
  if (!path) return false;
  const segments = path.split("/").filter(Boolean);
  if (segments.some((segment) => SENSITIVE_SEGMENTS.includes(segment))) return false;
  if (TRACKABLE_EXACT.has(path)) return true;
  return /^\/race-results\/[a-z0-9][a-z0-9-]{0,99}$/.test(path)
    && path !== "/race-results/records";
}

export function deviceClass(width: number): "mobile" | "tablet" | "desktop" {
  if (width < 768) return "mobile";
  if (width < 1100) return "tablet";
  return "desktop";
}

export function analyticsVersion() {
  return process.env.NEXT_PUBLIC_SITE_VERSION
    || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
    || "local-development";
}
