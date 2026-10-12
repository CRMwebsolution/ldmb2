import { NextRequest, NextResponse } from "next/server";
import { analyticsAdminClient, analyticsIdentity } from "@/lib/analytics/server";
import { deviceClass, isTrackablePath, normalizeAnalyticsPath } from "@/lib/analytics/policy";
import type { AnalyticsBatch } from "@/lib/analytics/types";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[a-z0-9_:\/.#=\[\]"-]{1,120}$/i;

function finite(value: unknown, min: number, max: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : min;
}

function safeToken(value: unknown, max = 120): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().slice(0, max);
  return clean && TOKEN.test(clean) ? clean : null;
}

function safeLabel(value: unknown, max = 80): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().replace(/\\s+/g, " ").slice(0, max);
  if (!clean || /@|\\b(?:\\+?1[- .]?)?\\d{3}[- .]\\d{3}[- .]\\d{4}\\b/.test(clean)) return null;
  return clean;
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function reject(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request: NextRequest) {
  try {
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 300_000) return reject(413, "Batch too large");
    const origin = request.headers.get("origin");
    const allowedOrigin = process.env.ANALYTICS_ALLOWED_ORIGIN || request.nextUrl.origin;
    if (origin && origin !== allowedOrigin && new URL(origin).host !== request.nextUrl.host) {
      return reject(403, "Cross-site analytics rejected");
    }

    const body = await request.json() as Partial<AnalyticsBatch>;
    const session = body.session;
    const pageview = body.pageview;
    if (!session || !pageview || !validUuid(session.id) || !validUuid(pageview.id)) {
      return reject(400, "Invalid analytics identifiers");
    }
    const pathname = normalizeAnalyticsPath(pageview.pathname);
    if (!pathname || !isTrackablePath(pathname)) {
      return reject(403, "This route is excluded from analytics");
    }
    if (!validUuid(session.id) || !validUuid(pageview.id)) return reject(400, "Invalid identifiers");

    const now = new Date();
    const startedAt = new Date(session.startedAt);
    const pageStartedAt = new Date(pageview.startedAt);
    if (!Number.isFinite(startedAt.valueOf()) || !Number.isFinite(pageStartedAt.valueOf())) {
      return reject(400, "Invalid timestamps");
    }
    if (startedAt > now || pageStartedAt > now) return reject(400, "Future timestamps rejected");

    const identity = analyticsIdentity();
    const db = analyticsAdminClient();
    const viewportWidth = Math.round(finite(pageview.viewportWidth, 200, 10_000));
    const viewportHeight = Math.round(finite(pageview.viewportHeight, 200, 10_000));
    const documentWidth = Math.round(finite(pageview.documentWidth, viewportWidth, 30_000));
    const documentHeight = Math.round(finite(pageview.documentHeight, viewportHeight, 200_000));
    const currentDevice = deviceClass(viewportWidth);

    const { error: versionError } = await db.from("web_analytics_site_versions").upsert({
      site_id: identity.siteId,
      deployment_version: identity.deploymentVersion,
      layout_version: identity.layoutVersion,
      preview_url: process.env.ANALYTICS_PREVIEW_URL || null,
    }, { onConflict: "site_id,deployment_version", ignoreDuplicates: true });
    if (versionError) throw versionError;

    const { error: sessionError } = await db.from("web_analytics_sessions").upsert({
      id: session.id,
      site_id: identity.siteId,
      deployment_version: identity.deploymentVersion,
      layout_version: identity.layoutVersion,
      device_class: deviceClass(finite(session.initialViewportWidth, 200, 10_000)),
      initial_viewport_width: Math.round(finite(session.initialViewportWidth, 200, 10_000)),
      initial_viewport_height: Math.round(finite(session.initialViewportHeight, 200, 10_000)),
      movement_sampled: session.movementSampled === true,
      started_at: startedAt.toISOString(),
      last_seen_at: now.toISOString(),
    }, { onConflict: "id" });
    if (sessionError) throw sessionError;

    const completed = pageview.completedAt ? new Date(pageview.completedAt) : null;
    const { error: pageError } = await db.from("web_analytics_pageviews").upsert({
      id: pageview.id,
      session_id: session.id,
      site_id: identity.siteId,
      deployment_version: identity.deploymentVersion,
      layout_version: identity.layoutVersion,
      pathname,
      device_class: currentDevice,
      viewport_width: viewportWidth,
      viewport_height: viewportHeight,
      document_width: documentWidth,
      document_height: documentHeight,
      started_at: pageStartedAt.toISOString(),
      completed_at: completed && Number.isFinite(completed.valueOf()) ? completed.toISOString() : null,
      active_ms: Math.round(finite(pageview.activeMs, 0, 86_400_000)),
      max_scroll_y: Math.round(finite(pageview.maxScrollY, 0, 200_000)),
      max_scroll_ratio: finite(pageview.maxScrollRatio, 0, 1),
    }, { onConflict: "id" });
    if (pageError) throw pageError;

    const interactions = (Array.isArray(body.interactions) ? body.interactions : []).slice(0, 100)
      .filter((event) => validUuid(event.clientEventId) && (event.kind === "click" || event.kind === "move"))
      .map((event) => ({
        pageview_id: pageview.id,
        client_event_id: event.clientEventId,
        event_kind: event.kind,
        occurred_offset_ms: Math.round(finite(event.offsetMs, 0, 86_400_000)),
        document_x: Math.round(finite(event.documentX, 0, 30_000)),
        document_y: Math.round(finite(event.documentY, 0, 200_000)),
        viewport_x: Math.round(finite(event.viewportX, -1000, 11_000)),
        viewport_y: Math.round(finite(event.viewportY, -1000, 11_000)),
        normalized_x: finite(event.normalizedX, 0, 1),
        normalized_y: finite(event.normalizedY, 0, 1),
        viewport_width: Math.round(finite(event.viewportWidth, 200, 10_000)),
        viewport_height: Math.round(finite(event.viewportHeight, 200, 10_000)),
        document_width: Math.round(finite(event.documentWidth, 200, 30_000)),
        document_height: Math.round(finite(event.documentHeight, 200, 200_000)),
        device_class: deviceClass(finite(event.viewportWidth, 200, 10_000)),
        element_key: safeToken(event.elementKey),
        element_label: safeLabel(event.elementLabel, 80),
        element_tag: safeToken(event.elementTag, 32),
        element_role: safeToken(event.elementRole, 32),
        element_offset_x: event.elementOffsetX == null ? null : finite(event.elementOffsetX, 0, 1),
        element_offset_y: event.elementOffsetY == null ? null : finite(event.elementOffsetY, 0, 1),
        position_context: ["document", "fixed", "sticky"].includes(event.positionContext || "") ? event.positionContext : null,
        probable_dead_click: event.kind === "click" && event.probableDeadClick === true,
        dead_click_reason: safeLabel(event.deadClickReason, 60),
      }));

    const sections = (Array.isArray(body.sections) ? body.sections : []).slice(0, 50)
      .map((section) => ({
        pageview_id: pageview.id,
        section_key: safeToken(section.key, 100),
        reached: section.reached === true,
        visible_ms: Math.round(finite(section.visibleMs, 0, 86_400_000)),
        max_visible_ratio: finite(section.maxVisibleRatio, 0, 1),
        section_top: Math.round(finite(section.top, 0, 200_000)),
        section_height: Math.round(finite(section.height, 0, 200_000)),
      }))
      .filter((section) => section.section_key);

    const attention = (Array.isArray(body.attention) ? body.attention : []).slice(0, 300)
      .map((cell) => ({
        pageview_id: pageview.id,
        cell_x: Math.round(finite(cell.x, 0, 47)),
        cell_y: Math.round(finite(cell.y, 0, 191)),
        visible_ms: Math.round(finite(cell.visibleMs, 0, 86_400_000)),
      }));

    if (interactions.length) {
      const { error } = await db.from("web_analytics_interactions").upsert(interactions, {
        onConflict: "pageview_id,client_event_id", ignoreDuplicates: true,
      });
      if (error) throw error;
    }
    if (sections.length) {
      const { error } = await db.from("web_analytics_section_views").upsert(sections, {
        onConflict: "pageview_id,section_key",
      });
      if (error) throw error;
    }
    if (attention.length) {
      const { error } = await db.from("web_analytics_attention_cells").upsert(attention, {
        onConflict: "pageview_id,cell_x,cell_y",
      });
      if (error) throw error;
    }

    return NextResponse.json({ accepted: true }, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("First-party analytics ingestion failed", error);
    return reject(503, "Analytics unavailable");
  }
}
