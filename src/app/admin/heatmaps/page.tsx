"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, Download, Eye, EyeOff, Flame, MousePointer2, Move, RefreshCw,
  Smartphone, Tablet, Monitor, TriangleAlert,
} from "lucide-react";
import { useAuth } from "@/lib/supabase/auth-context";
import type { AnalyticsSummary, DashboardPoint, DeviceClass } from "@/lib/analytics/types";
import { HeatmapCanvas, type VisibleHeatPoint } from "@/components/heatmaps/HeatmapCanvas";

type HeatmapMode = "click" | "move" | "scroll" | "attention";
const DEVICE_WIDTH: Record<DeviceClass | "all", number> = {
  desktop: 1440, tablet: 900, mobile: 390, all: 1440,
};
const VIEWPORT_HEIGHT = 720;
const EMPTY: AnalyticsSummary = {
  filters: {
    pathname: "/", device: "desktop", version: "all", spatialVersion: null,
    spatialDevice: null, spatialViewportWidth: null, spatialViewportHeight: null, days: 7,
  },
  options: { pages: ["/"], versions: [] },
  totals: {
    sessions: 0, pageviews: 0, clicks: 0, movements: 0,
    deadClicks: 0, averageScrollDepth: 0, averageActiveMs: 0,
  },
  points: [], scrollRatios: [], attention: [], sections: [],
  topElements: [], deadClickHotspots: [], scrollBands: [], aiSummary: {
    ctaClicks: [], deadClickHotspots: [], sectionReach: [], scrollDropOff: [],
  },
};

function seconds(ms: number) {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function validSelector(key?: string | null) {
  return !!key && (key.startsWith("#") || key.startsWith("[data-heatmap-id="));
}

export default function HeatmapsPage() {
  const { session } = useAuth();
  const [mode, setMode] = useState<HeatmapMode>("click");
  const [device, setDevice] = useState<DeviceClass | "all">("desktop");
  const [pathname, setPathname] = useState("/");
  const [version, setVersion] = useState("all");
  const [days, setDays] = useState(7);
  const [intensity, setIntensity] = useState(0.62);
  const [showPoints, setShowPoints] = useState(true);
  const [showElements, setShowElements] = useState(false);
  const [showSections, setShowSections] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const [documentHeight, setDocumentHeight] = useState(2000);
  const [scale, setScale] = useState(1);
  const [revision, setRevision] = useState(0);
  const [sectionRects, setSectionRects] = useState<{ key: string; top: number; left: number; width: number; height: number }[]>([]);
  const [elementRects, setElementRects] = useState<{ key: string; top: number; left: number; width: number; height: number }[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewHostRef = useRef<HTMLDivElement>(null);
  const width = summary.filters.device === device && summary.filters.spatialViewportWidth
    ? summary.filters.spatialViewportWidth
    : DEVICE_WIDTH[device];

  useEffect(() => {
    const host = previewHostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => {
      const available = Math.max(280, entry.contentRect.width - 4);
      setScale(Math.min(1, available / width));
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, [width]);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const query = new URLSearchParams({
      pathname, device, version, days: String(days),
    });
    fetch(`/api/analytics/summary?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) throw new Error((await response.json()).error || "Could not load analytics");
      return response.json() as Promise<AnalyticsSummary>;
    }).then((data) => {
      setSummary(data);
      if (!data.options.pages.includes(pathname) && data.options.pages[0]) setPathname(data.options.pages[0]);
    }).catch((reason) => {
      if (reason.name !== "AbortError") setError(reason.message || "Could not load analytics");
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [days, device, pathname, revision, session?.access_token, version]);

  const updatePreviewGeometry = useCallback(() => {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc) return;
    setScrollTop(frame.contentWindow?.scrollY || 0);
    setDocumentHeight(Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight || 0));
    const sections = Array.from(doc.querySelectorAll<HTMLElement>(
      "[data-heatmap-section],main > section,main section[id]",
    )).slice(0, 40);
    setSectionRects(sections.map((element, index) => {
      const rect = element.getBoundingClientRect();
      return {
        key: element.dataset.heatmapSection || element.id || `section-${index + 1}`,
        top: rect.top, left: rect.left, width: rect.width, height: rect.height,
      };
    }).filter((rect) => rect.top + rect.height >= 0 && rect.top <= VIEWPORT_HEIGHT));

    const seen = new Set<string>();
    const rects: { key: string; top: number; left: number; width: number; height: number }[] = [];
    for (const item of summary.topElements) {
      if (!validSelector(item.key) || seen.has(item.key)) continue;
      seen.add(item.key);
      try {
        const element = doc.querySelector<HTMLElement>(item.key);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        if (rect.top + rect.height >= 0 && rect.top <= VIEWPORT_HEIGHT) {
          rects.push({ key: item.key, top: rect.top, left: rect.left, width: rect.width, height: rect.height });
        }
      } catch {}
    }
    setElementRects(rects);
  }, [summary.topElements]);

  const onFrameLoad = useCallback(() => {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    const win = frame?.contentWindow;
    if (!doc || !win) return;
    const block = (event: Event) => {
      if (event.type === "click" || event.type === "submit") {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    doc.addEventListener("click", block, true);
    doc.addEventListener("submit", block, true);
    doc.querySelectorAll("form,button,input,select,textarea").forEach((element) => {
      element.setAttribute("data-analytics-private", "true");
    });
    win.addEventListener("scroll", updatePreviewGeometry, { passive: true });
    updatePreviewGeometry();
  }, [updatePreviewGeometry]);

  useEffect(() => {
    updatePreviewGeometry();
  }, [showElements, showSections, updatePreviewGeometry]);

  const visiblePoints = useMemo<VisibleHeatPoint[]>(() => {
    const frameDoc = iframeRef.current?.contentDocument;
    const frameScroll = iframeRef.current?.contentWindow?.scrollY || scrollTop;
    const source: DashboardPoint[] = summary.points.filter((point) =>
      mode === "click" ? point.kind === "click" : mode === "move" ? point.kind === "move" : false,
    );
    if (mode === "attention") {
      return summary.attention.map((cell) => {
        const x = ((cell.x + 0.5) / 12) * width;
        const documentY = ((cell.y + 0.5) / 48) * documentHeight;
        return { x, y: documentY - frameScroll, weight: Math.max(0.2, cell.visibleMs / 1000) };
      });
    }
    if (mode === "scroll") {
      const rows = 80;
      return Array.from({ length: rows }, (_, row) => {
        const documentY = ((row + 0.5) / rows) * documentHeight;
        const ratio = documentY / Math.max(documentHeight, 1);
        const weight = summary.scrollRatios.filter((depth) => depth >= ratio).length;
        return { x: width / 2, y: documentY - frameScroll, weight: Math.max(0, weight) };
      });
    }
    return source.map((point) => {
      let documentX = point.x * (width / Math.max(point.documentWidth, 1));
      let documentY = point.y * (documentHeight / Math.max(point.documentHeight, 1));
      if (frameDoc && validSelector(point.elementKey)
          && point.elementOffsetX != null && point.elementOffsetY != null) {
        try {
          const element = frameDoc.querySelector<HTMLElement>(point.elementKey!);
          if (element) {
            const rect = element.getBoundingClientRect();
            documentX = rect.left + rect.width * point.elementOffsetX;
            documentY = frameScroll + rect.top + rect.height * point.elementOffsetY;
          }
        } catch {}
      }
      return {
        x: point.positionContext === "fixed" ? point.viewportX : documentX,
        y: point.positionContext === "fixed" ? point.viewportY : documentY - frameScroll,
        dead: point.dead,
        weight: point.dead ? 1.5 : 1,
      };
    });
  }, [documentHeight, mode, scrollTop, summary.attention, summary.points, summary.scrollRatios, width]);

  async function exportPng() {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc) return;
    const output = document.createElement("canvas");
    output.width = width;
    output.height = VIEWPORT_HEIGHT;
    const context = output.getContext("2d");
    if (!context) return;
    context.fillStyle = "#f8fafc";
    context.fillRect(0, 0, output.width, output.height);

    try {
      const clone = doc.body.cloneNode(true) as HTMLElement;
      const sourceElements = [doc.body, ...Array.from(doc.body.querySelectorAll<HTMLElement>("*"))];
      const cloneElements = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
      sourceElements.forEach((source, index) => {
        const target = cloneElements[index];
        if (!target) return;
        const computed = frame.contentWindow!.getComputedStyle(source);
        const inline = Array.from(computed).map((property) => `${property}:${computed.getPropertyValue(property)};`).join("");
        target.setAttribute("style", inline);
      });
      clone.querySelectorAll("script,iframe,video,form").forEach((node) => node.remove());
      clone.querySelectorAll("img").forEach((image) => {
        image.removeAttribute("src");
        image.removeAttribute("srcset");
        image.style.background = "#e2e8f0";
      });
      const serialized = new XMLSerializer().serializeToString(clone);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${VIEWPORT_HEIGHT}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;transform:translateY(-${scrollTop}px)">${serialized}</div></foreignObject></svg>`;
      const image = new Image();
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Preview could not be rasterized"));
        image.src = url;
      });
      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
    } catch {
      context.fillStyle = "#111827";
      context.font = "bold 24px system-ui";
      context.fillText("Little Doo Mud Bog", 28, 48);
      context.font = "16px system-ui";
      context.fillText(`${location.origin}${pathname}`, 28, 78);
    }
    const overlay = previewHostRef.current?.querySelector("canvas");
    if (overlay) context.drawImage(overlay, 0, 0, width, VIEWPORT_HEIGHT);
    const link = document.createElement("a");
    link.download = `ldmb-${mode}-heatmap-${pathname.replaceAll("/", "-") || "home"}.png`;
    link.href = output.toDataURL("image/png");
    link.click();
  }

  const mostActive = summary.sections[0];
  const lowAttention = [...summary.sections].sort((a, b) => a.averageVisibleMs - b.averageVisibleMs).slice(0, 4);
  const currentVersionUnavailable = version !== "all" && version !== summary.options.versions[0];

  return <div className="space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2"><Flame className="w-6 h-6" style={{ color: "var(--primary)" }} /> Heatmaps</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-fg)" }}>Private, first-party behavior analytics. Sensitive routes and form contents are excluded.</p>
      </div>
      <button type="button" onClick={() => setRevision((value) => value + 1)}
        className="rounded-lg border px-3 py-2 text-sm font-bold inline-flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
      </button>
    </header>

    {error && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">{error}</p>}
    {currentVersionUnavailable && <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm flex gap-2"><TriangleAlert className="w-4 h-4 shrink-0" /> Historical layout metrics are available, but the spatial overlay is hidden because that old page build is not available for exact replay.</p>}
    {version === "all" && summary.filters.spatialVersion && <p className="rounded-xl border p-3 text-sm" style={{ borderColor: "var(--border)" }}>Totals include all versions. The spatial overlay uses only the newest recorded layout version ({summary.filters.spatialVersion.slice(0, 18)}), so different layouts are never combined on one heatmap.</p>}

    <div className="grid grid-cols-1 xl:grid-cols-[270px_minmax(0,1fr)_310px] gap-4 items-start">
      <aside className="xl:sticky xl:top-32 xl:max-h-[calc(100vh-9rem)] overflow-y-auto rounded-2xl border p-4 space-y-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <ControlTitle>Heatmap Type</ControlTitle>
        <div className="grid grid-cols-2 xl:grid-cols-1 gap-2">
          {([
            ["click", "Click Heatmap", MousePointer2], ["move", "Movement Heatmap", Move],
            ["scroll", "Scroll Heatmap", Activity], ["attention", "Attention Heatmap", Flame],
          ] as const).map(([value, label, Icon]) => <button key={value} type="button" onClick={() => setMode(value)}
            className="rounded-lg border p-2 text-left text-sm font-semibold flex items-center gap-2"
            style={{ borderColor: mode === value ? "var(--primary)" : "var(--border)", background: mode === value ? "var(--muted)" : "transparent" }}>
            <Icon className="w-4 h-4" /> {label}
          </button>)}
        </div>

        <ControlTitle>Display Options</ControlTitle>
        <label className="text-xs font-bold block">Intensity / sensitivity
          <input className="w-full mt-2 accent-amber-600" type="range" min="0.1" max="1" step="0.05" value={intensity} onChange={(event) => setIntensity(Number(event.target.value))} />
        </label>
        <Toggle label="Individual click points" checked={showPoints} onChange={setShowPoints} />
        <Toggle label="Element outlines" checked={showElements} onChange={setShowElements} />
        <Toggle label="Section statistics" checked={showSections} onChange={setShowSections} />

        <ControlTitle>Device</ControlTitle>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["desktop", "Desktop", Monitor], ["tablet", "Tablet", Tablet],
            ["mobile", "Mobile", Smartphone], ["all", "All Traffic", Activity],
          ] as const).map(([value, label, Icon]) => <button key={value} type="button" onClick={() => setDevice(value)}
            className="rounded-lg border px-2 py-2 text-xs font-bold flex items-center gap-1.5"
            style={{ borderColor: device === value ? "var(--primary)" : "var(--border)" }}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>)}
        </div>
        {device === "all" && <p className="text-xs" style={{ color: "var(--muted-fg)" }}>Aggregate metrics include all devices; the spatial preview uses the newest recorded {summary.filters.spatialDevice || "device"} layout. Select one device for a device-specific heatmap.</p>}

        <label className="text-xs font-bold block">Page
          <select className="mt-1 w-full rounded-lg border p-2" style={{ background: "var(--surface)", borderColor: "var(--border)" }} value={pathname} onChange={(event) => setPathname(event.target.value)}>
            {[...new Set([pathname, ...summary.options.pages])].map((page) => <option key={page} value={page}>{page}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold block">Date Range
          <select className="mt-1 w-full rounded-lg border p-2" style={{ background: "var(--surface)", borderColor: "var(--border)" }} value={days} onChange={(event) => setDays(Number(event.target.value))}>
            <option value={1}>24 hours</option><option value={7}>7 days</option>
            <option value={30}>30 days</option><option value={90}>90 days</option>
          </select>
        </label>
        <label className="text-xs font-bold block">Site / version
          <select className="mt-1 w-full rounded-lg border p-2" style={{ background: "var(--surface)", borderColor: "var(--border)" }} value={version} onChange={(event) => setVersion(event.target.value)}>
            <option value="all">All versions (metrics)</option>
            {summary.options.versions.map((item) => <option key={item} value={item}>{item.slice(0, 18)}</option>)}
          </select>
        </label>
        <button type="button" onClick={exportPng} className="w-full rounded-lg px-3 py-2 text-sm font-bold inline-flex justify-center items-center gap-2" style={{ background: "var(--primary)", color: "var(--primary-fg)" }}>
          <Download className="w-4 h-4" /> Export Heatmap PNG
        </button>
      </aside>

      <section ref={previewHostRef} className="min-w-0 rounded-2xl border overflow-hidden" style={{ background: "#111827", borderColor: "var(--border)" }}>
        <div className="h-11 bg-slate-800 px-3 flex items-center gap-3 text-slate-300">
          <span className="flex gap-1"><i className="w-3 h-3 rounded-full bg-red-400" /><i className="w-3 h-3 rounded-full bg-amber-400" /><i className="w-3 h-3 rounded-full bg-emerald-400" /></span>
          <div className="flex-1 rounded-md bg-slate-700 px-3 py-1 text-xs truncate">https://littledoomudbog.com{pathname}</div>
        </div>
        <div className="overflow-auto p-2">
          <div className="mx-auto relative" style={{ width: width * scale, height: VIEWPORT_HEIGHT * scale }}>
            <div className="absolute left-0 top-0 origin-top-left bg-white" style={{ width, height: VIEWPORT_HEIGHT, transform: `scale(${scale})` }}>
              <iframe ref={iframeRef} title="Non-interactive heatmap website preview" src={`${pathname}?heatmap_preview=1`}
                sandbox="allow-same-origin allow-scripts" onLoad={onFrameLoad}
                className="block border-0 bg-white" style={{ width, height: VIEWPORT_HEIGHT }} />
              {!currentVersionUnavailable && <HeatmapCanvas width={width} height={VIEWPORT_HEIGHT} mode={mode}
                points={visiblePoints} intensity={intensity} showPoints={showPoints} />}
              {showSections && sectionRects.map((rect) => {
                const stat = summary.sections.find((item) => item.key === rect.key);
                return <div key={rect.key} className="absolute z-20 pointer-events-none border-2 border-cyan-400/70"
                  style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}>
                  <span className="absolute left-1 top-1 bg-slate-950/85 text-white text-[10px] px-1.5 py-1 rounded">
                    {rect.key}{stat ? ` · ${stat.reachPercent.toFixed(0)}% reach · ${seconds(stat.averageVisibleMs)}` : ""}
                  </span>
                </div>;
              })}
              {showElements && elementRects.map((rect) => <div key={rect.key} className="absolute z-20 pointer-events-none border-2 border-fuchsia-400"
                style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} />)}
            </div>
          </div>
        </div>
        <div className="h-9 bg-slate-800 px-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>{width}px simulated viewport · {Math.round(scale * 100)}% dashboard scale</span>
          <span>Website scrolls inside this browser frame</span>
        </div>
      </section>

      <aside className="xl:sticky xl:top-32 xl:max-h-[calc(100vh-9rem)] overflow-y-auto rounded-2xl border p-4 space-y-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Sessions" value={summary.totals.sessions} />
          <Metric label="Total clicks" value={summary.totals.clicks} />
          <Metric label="Sampled moves" value={summary.totals.movements} />
          <Metric label="Dead clicks" value={summary.totals.deadClicks} warning />
          <Metric label="Avg. scroll" value={`${summary.totals.averageScrollDepth.toFixed(0)}%`} />
          <Metric label="Avg. page time" value={seconds(summary.totals.averageActiveMs)} />
        </div>
        <StatList title="Top clicked elements" empty="No clicks in this filter.">
          {summary.topElements.map((item) => <li key={item.key} className="flex justify-between gap-3"><span className="truncate" title={item.key}>{item.label}</span><b>{item.clicks}</b></li>)}
        </StatList>
        <StatList title="Scroll-depth bands" empty="No scroll data.">
          {summary.scrollBands.map((item) => <li key={item.label} className="flex justify-between"><span>{item.label}</span><b>{item.percent.toFixed(0)}%</b></li>)}
        </StatList>
        <StatList title="Probable dead-click hotspots" empty="No probable dead clicks.">
          {summary.deadClickHotspots.map((item) => <li key={item.key} className="flex justify-between gap-3 text-red-600"><span className="truncate">{item.key}</span><b>{item.clicks}</b></li>)}
        </StatList>
        <div>
          <h2 className="text-xs uppercase tracking-wider font-black mb-2">Section attention</h2>
          {mostActive ? <p className="text-sm"><b>Most active:</b> {mostActive.key} · {seconds(mostActive.averageVisibleMs)}</p> : <p className="text-sm" style={{ color: "var(--muted-fg)" }}>No section data.</p>}
          {lowAttention.length > 0 && <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--muted-fg)" }}>
            {lowAttention.map((item) => <li key={item.key}>{item.key}: {item.reachPercent.toFixed(0)}% reach · {seconds(item.averageVisibleMs)}</li>)}
          </ul>}
        </div>
        <p className="text-xs rounded-lg p-3" style={{ background: "var(--muted)", color: "var(--muted-fg)" }}>
          AI-ready summaries use aggregates only. Raw movement coordinates are never sent to an AI service.
        </p>
      </aside>
    </div>
  </div>;
}

function ControlTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11px] uppercase tracking-widest font-black mb-2" style={{ color: "var(--muted-fg)" }}>{children}</h2>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!checked)} className="w-full flex items-center justify-between text-sm py-1">
    <span>{label}</span>{checked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
  </button>;
}
function Metric({ label, value, warning = false }: { label: string; value: string | number; warning?: boolean }) {
  return <div className="rounded-xl p-3" style={{ background: "var(--muted)" }}>
    <p className="text-[10px] uppercase font-bold" style={{ color: "var(--muted-fg)" }}>{label}</p>
    <p className={`text-xl font-black mt-1 ${warning ? "text-red-600" : ""}`}>{value}</p>
  </div>;
}
function StatList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const count = Array.isArray(children) ? children.length : children ? 1 : 0;
  return <div><h2 className="text-xs uppercase tracking-wider font-black mb-2">{title}</h2>
    {count ? <ol className="space-y-2 text-xs">{children}</ol> : <p className="text-xs" style={{ color: "var(--muted-fg)" }}>{empty}</p>}
  </div>;
}
