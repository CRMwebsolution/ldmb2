import { NextRequest, NextResponse } from "next/server";
import { analyticsAdminClient, requireAnalyticsAdmin } from "@/lib/analytics/server";
import { ANALYTICS_SITE_ID, isTrackablePath, normalizeAnalyticsPath } from "@/lib/analytics/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_DAYS = new Set([1, 7, 30, 90]);
const ALLOWED_DEVICES = new Set(["all", "desktop", "tablet", "mobile"]);

function chunks<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size));
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export async function GET(request: NextRequest) {
  try {
    if (!await requireAnalyticsAdmin(request)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const daysInput = Number(params.get("days") || 7);
    const days = ALLOWED_DAYS.has(daysInput) ? daysInput : 7;
    const device = ALLOWED_DEVICES.has(params.get("device") || "")
      ? params.get("device")!
      : "desktop";
    const pathInput = params.get("pathname") || "/";
    const pathname = normalizeAnalyticsPath(pathInput);
    if (!pathname || !isTrackablePath(pathname)) {
      return NextResponse.json({ error: "Excluded or unknown route" }, { status: 400 });
    }
    const version = (params.get("version") || "all").slice(0, 120);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const db = analyticsAdminClient();

    const pageviews: Record<string, unknown>[] = [];
    for (let start = 0; start < 20_000; start += 1000) {
      let query = db.from("web_analytics_pageviews").select(
        "id,session_id,pathname,deployment_version,device_class,viewport_width,viewport_height,document_width,document_height,active_ms,max_scroll_ratio,started_at",
      ).eq("site_id", ANALYTICS_SITE_ID).eq("pathname", pathname)
        .gte("started_at", since).order("started_at", { ascending: false }).range(start, start + 999);
      if (device !== "all") query = query.eq("device_class", device);
      if (version !== "all") query = query.eq("deployment_version", version);
      const { data, error } = await query;
      if (error) throw error;
      pageviews.push(...(data || []));
      if (!data || data.length < 1000) break;
    }

    const { data: optionRows, error: optionsError } = await db.from("web_analytics_pageviews")
      .select("pathname,deployment_version,started_at").eq("site_id", ANALYTICS_SITE_ID)
      .gte("started_at", since).order("started_at", { ascending: false }).limit(10_000);
    if (optionsError) throw optionsError;

    const ids = pageviews.map((row) => String(row.id));
    const interactions: Record<string, unknown>[] = [];
    const sectionRows: Record<string, unknown>[] = [];
    const attentionRows: Record<string, unknown>[] = [];
    for (const group of chunks(ids, 120)) {
      const [interactionResult, sectionResult, attentionResult] = await Promise.all([
        db.from("web_analytics_interactions").select(
          "pageview_id,event_kind,document_x,document_y,viewport_x,viewport_y,normalized_x,normalized_y,document_width,document_height,viewport_width,viewport_height,element_key,element_label,element_offset_x,element_offset_y,position_context,probable_dead_click",
        ).in("pageview_id", group).limit(5000),
        db.from("web_analytics_section_views").select(
          "pageview_id,section_key,reached,visible_ms,max_visible_ratio",
        ).in("pageview_id", group).limit(5000),
        db.from("web_analytics_attention_cells").select(
          "pageview_id,cell_x,cell_y,visible_ms",
        ).in("pageview_id", group).limit(5000),
      ]);
      if (interactionResult.error) throw interactionResult.error;
      if (sectionResult.error) throw sectionResult.error;
      if (attentionResult.error) throw attentionResult.error;
      interactions.push(...(interactionResult.data || []));
      sectionRows.push(...(sectionResult.data || []));
      attentionRows.push(...(attentionResult.data || []));
    }

    const pageById = new Map(pageviews.map((row) => [String(row.id), row]));
    const spatialVersion = version === "all"
      ? String(pageviews[0]?.deployment_version || "") || null
      : version;
    const spatialPageIds = new Set(pageviews
      .filter((row) => spatialVersion && row.deployment_version === spatialVersion)
      .map((row) => String(row.id)));
    const spatialInteractions = interactions.filter((row) => spatialPageIds.has(String(row.pageview_id)));
    const spatialSessionIds = new Set(pageviews
      .filter((row) => spatialPageIds.has(String(row.id)))
      .map((row) => String(row.session_id)));
    const sessionIds = new Set(pageviews.map((row) => String(row.session_id)));
    const clicks = interactions.filter((row) => row.event_kind === "click");
    const moves = interactions.filter((row) => row.event_kind === "move");
    const dead = clicks.filter((row) => row.probable_dead_click === true);
    const displayClicks = spatialInteractions.filter((row) => row.event_kind === "click");
    const top = new Map<string, { label: string; clicks: number; deadClicks: number }>();
    for (const row of displayClicks) {
      const key = String(row.element_key || "unidentified");
      const current = top.get(key) || { label: String(row.element_label || key), clicks: 0, deadClicks: 0 };
      current.clicks += 1;
      if (row.probable_dead_click === true) current.deadClicks += 1;
      top.set(key, current);
    }

    const sectionMap = new Map<string, {
      pageviews: Set<string>; sessions: Set<string>; visible: number[]; ratios: number[];
    }>();
    for (const row of sectionRows) {
      if (!spatialPageIds.has(String(row.pageview_id))) continue;
      const key = String(row.section_key);
      const entry = sectionMap.get(key) || {
        pageviews: new Set<string>(), sessions: new Set<string>(), visible: [], ratios: [],
      };
      const pageviewId = String(row.pageview_id);
      entry.pageviews.add(pageviewId);
      const sessionId = pageById.get(pageviewId)?.session_id;
      if (sessionId) entry.sessions.add(String(sessionId));
      entry.visible.push(Number(row.visible_ms || 0));
      entry.ratios.push(Number(row.max_visible_ratio || 0));
      sectionMap.set(key, entry);
    }

    const sections = [...sectionMap.entries()].map(([key, entry]) => ({
      key,
      sessions: entry.sessions.size,
      reachPercent: spatialSessionIds.size ? (entry.sessions.size / spatialSessionIds.size) * 100 : 0,
      averageVisibleMs: average(entry.visible),
      averageMaxVisibleRatio: average(entry.ratios),
    })).sort((a, b) => b.averageVisibleMs - a.averageVisibleMs);

    const attentionMap = new Map<string, number>();
    for (const row of attentionRows) {
      if (!spatialPageIds.has(String(row.pageview_id))) continue;
      const key = `${row.cell_x}:${row.cell_y}`;
      attentionMap.set(key, (attentionMap.get(key) || 0) + Number(row.visible_ms || 0));
    }

    const ratios = pageviews.map((row) => Number(row.max_scroll_ratio || 0));
    const spatialRatios = pageviews.filter((row) => spatialPageIds.has(String(row.id)))
      .map((row) => Number(row.max_scroll_ratio || 0));
    const bands = [
      { label: "0–25%", min: 0, max: 0.25 },
      { label: "25–50%", min: 0.25, max: 0.5 },
      { label: "50–75%", min: 0.5, max: 0.75 },
      { label: "75–100%", min: 0.75, max: 1.001 },
    ].map((band) => {
      const count = ratios.filter((ratio) => ratio >= band.min && ratio < band.max).length;
      return {
        label: band.label,
        sessions: count,
        percent: ratios.length ? count / ratios.length * 100 : 0,
      };
    });

    const topElements = [...top.entries()].map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.clicks - a.clicks).slice(0, 12);
    const deadClickHotspots = topElements.filter((item) => item.deadClicks)
      .map((item) => ({ key: item.key, clicks: item.deadClicks }))
      .sort((a, b) => b.clicks - a.clicks).slice(0, 10);

    return NextResponse.json({
      filters: { pathname, device, version, spatialVersion, days },
      options: {
        pages: [...new Set((optionRows || []).map((row) => row.pathname))].filter(isTrackablePath).sort(),
        versions: [...new Set((optionRows || []).map((row) => row.deployment_version))],
      },
      totals: {
        sessions: sessionIds.size,
        pageviews: pageviews.length,
        clicks: clicks.length,
        movements: moves.length,
        deadClicks: dead.length,
        averageScrollDepth: average(ratios) * 100,
        averageActiveMs: average(pageviews.map((row) => Number(row.active_ms || 0))),
      },
      points: spatialInteractions.slice(0, 5000).map((row) => ({
        kind: row.event_kind,
        x: Number(row.document_x), y: Number(row.document_y),
        normalizedX: Number(row.normalized_x), normalizedY: Number(row.normalized_y),
        documentWidth: Number(row.document_width), documentHeight: Number(row.document_height),
        viewportWidth: Number(row.viewport_width), viewportHeight: Number(row.viewport_height),
        viewportX: Number(row.viewport_x), viewportY: Number(row.viewport_y),
        elementKey: row.element_key, elementOffsetX: row.element_offset_x,
        elementOffsetY: row.element_offset_y, positionContext: row.position_context,
        dead: row.probable_dead_click === true,
      })),
      scrollRatios: spatialRatios,
      attention: [...attentionMap.entries()].map(([key, visibleMs]) => {
        const [x, y] = key.split(":").map(Number);
        return { x, y, visibleMs };
      }),
      sections,
      topElements,
      deadClickHotspots,
      scrollBands: bands,
      aiSummary: {
        ctaClicks: topElements.slice(0, 10).map(({ key, clicks }) => ({ key, clicks })),
        deadClickHotspots,
        sectionReach: sections.map(({ key, reachPercent, averageVisibleMs }) => ({
          key, reachPercent, averageVisibleMs,
        })),
        scrollDropOff: bands.map(({ label, percent }) => ({ label, percent })),
      },
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    console.error("Analytics summary failed", error);
    return NextResponse.json({ error: "Analytics unavailable" }, { status: 503 });
  }
}
