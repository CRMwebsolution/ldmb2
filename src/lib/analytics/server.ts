import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { ANALYTICS_SITE_ID } from "./policy";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

export function serverAnalyticsVersion() {
  return process.env.ANALYTICS_SITE_VERSION
    || process.env.VERCEL_GIT_COMMIT_SHA
    || process.env.NEXT_PUBLIC_SITE_VERSION
    || "local-development";
}

export function serverLayoutVersion() {
  return process.env.ANALYTICS_LAYOUT_VERSION
    || process.env.NEXT_PUBLIC_LAYOUT_VERSION
    || serverAnalyticsVersion();
}

export function analyticsAdminClient(): SupabaseClient {
  return createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function requireAnalyticsAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return false;

  const scoped = createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { data: userData, error: userError } = await scoped.auth.getUser(token);
  if (userError || !userData.user) return false;
  const { data, error } = await scoped.rpc("is_current_race_admin");
  return !error && data === true;
}

export function analyticsIdentity() {
  return {
    siteId: ANALYTICS_SITE_ID,
    deploymentVersion: serverAnalyticsVersion(),
    layoutVersion: serverLayoutVersion(),
  };
}
