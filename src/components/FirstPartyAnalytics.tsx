"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/supabase/auth-context";
import { deviceClass, isTrackablePath } from "@/lib/analytics/policy";
import type {
  AnalyticsBatch, AnalyticsInteraction, AnalyticsSection, AttentionCell,
} from "@/lib/analytics/types";

const FLUSH_MS = 12_000;
const MOVE_MS = 275;
const MAX_MOVES = 400;
const MAX_EVENTS_PER_FLUSH = 80;
const SESSION_KEY = "ldmb-analytics-session";

type SectionState = AnalyticsSection & { visible: boolean };

function randomId() {
  return crypto.randomUUID();
}

function safeSessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const id = randomId();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return randomId();
  }
}

function documentSize() {
  const root = document.documentElement;
  const body = document.body;
  return {
    width: Math.max(root.scrollWidth, root.clientWidth, body?.scrollWidth || 0),
    height: Math.max(root.scrollHeight, root.clientHeight, body?.scrollHeight || 0),
  };
}

function cleanToken(value: string | undefined, max = 100) {
  if (!value) return undefined;
  const clean = value.trim().slice(0, max);
  return /^[a-z0-9_:\/.#-]+$/i.test(clean) ? clean : undefined;
}

function safeElement(target: EventTarget | null) {
  const element = target instanceof Element ? target : null;
  if (!element || element.closest("input,textarea,select,option,[contenteditable='true'],[data-analytics-private],form")) {
    return null;
  }
  const node = element.closest<HTMLElement>("[data-heatmap-id],a,button,[role='button'],[role='link']") || element as HTMLElement;
  const explicit = cleanToken(node.dataset.heatmapId);
  const id = cleanToken(node.id);
  let href: string | undefined;
  if (node instanceof HTMLAnchorElement) {
    try {
      const url = new URL(node.href, location.origin);
      if (url.origin === location.origin) href = cleanToken(url.pathname);
    } catch {}
  }
  const tag = node.tagName.toLowerCase();
  const role = cleanToken(node.getAttribute("role") || undefined, 32);
  const key = explicit
    ? `[data-heatmap-id="${explicit}"]`
    : id
      ? `#${id}`
      : href
        ? `a:${href}`
        : role
          ? `${tag}[role=${role}]`
          : tag;
  const label = node.dataset.heatmapLabel?.trim().slice(0, 80);
  const rect = node.getBoundingClientRect();
  const style = getComputedStyle(node);
  const positionContext = style.position === "fixed" ? "fixed" : style.position === "sticky" ? "sticky" : "document";
  return {
    node,
    key,
    label: label && !/@|\d{3}[- .]?\d{3}/.test(label) ? label : undefined,
    tag,
    role,
    rect,
    positionContext: positionContext as "document" | "fixed" | "sticky",
  };
}

export function FirstPartyAnalytics() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const stopRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    stopRef.current?.();
    stopRef.current = null;
    if (loading || user || !isTrackablePath(pathname)) return;
    if (window.self !== window.top || new URLSearchParams(location.search).has("heatmap_preview")) return;
    if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ANALYTICS_IN_DEVELOPMENT !== "true") return;
    if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true || navigator.doNotTrack === "1") return;

    const initialDoc = documentSize();
    const initialViewportWidth = innerWidth;
    const initialViewportHeight = innerHeight;
    const sessionId = safeSessionId();
    const pageviewId = randomId();
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const initialDevice = deviceClass(innerWidth);
    const movementSampled = Math.random() < 0.25;
    let activeMs = 0;
    let maxScrollY = Math.max(0, window.scrollY);
    let maxScrollRatio = Math.min(1, (window.scrollY + innerHeight) / Math.max(initialDoc.height, 1));
    let lastTick = performance.now();
    let lastMove = 0;
    let moveCount = 0;
    let stopped = false;
    let mutationVersion = 0;
    let recentClick: { key: string; at: number } | null = null;
    const interactions: AnalyticsInteraction[] = [];
    const sections = new Map<Element, SectionState>();
    const attention = new Map<string, AttentionCell>();

    const mutationObserver = new MutationObserver(() => { mutationVersion += 1; });
    mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true });

    const sectionElements = Array.from(document.querySelectorAll<HTMLElement>(
      "[data-heatmap-section],main > section,main section[id]",
    )).slice(0, 40);
    sectionElements.forEach((element, index) => {
      const key = cleanToken(element.dataset.heatmapSection || element.id)
        || `section-${index + 1}`;
      const rect = element.getBoundingClientRect();
      sections.set(element, {
        key, reached: false, visibleMs: 0, maxVisibleRatio: 0,
        top: Math.round(rect.top + scrollY), height: Math.round(rect.height), visible: false,
      });
    });

    const sectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const state = sections.get(entry.target);
        if (!state) continue;
        state.visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
        state.reached ||= entry.isIntersecting;
        state.maxVisibleRatio = Math.max(state.maxVisibleRatio, entry.intersectionRatio);
        const rect = (entry.target as HTMLElement).getBoundingClientRect();
        state.top = Math.round(rect.top + scrollY);
        state.height = Math.round(rect.height);
      }
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    sectionElements.forEach((element) => sectionObserver.observe(element));

    function capturePosition(event: PointerEvent, kind: "click" | "move", dead = false, deadReason?: string) {
      const size = documentSize();
      const safe = safeElement(event.target);
      const x = Math.max(0, Math.round(event.pageX));
      const y = Math.max(0, Math.round(event.pageY));
      const vw = innerWidth;
      const vh = innerHeight;
      const rect = safe?.rect;
      const interaction: AnalyticsInteraction = {
        clientEventId: randomId(),
        kind,
        offsetMs: Math.max(0, Math.round(performance.now() - started)),
        documentX: x,
        documentY: y,
        viewportX: Math.round(event.clientX),
        viewportY: Math.round(event.clientY),
        normalizedX: Math.min(1, x / Math.max(size.width, 1)),
        normalizedY: Math.min(1, y / Math.max(size.height, 1)),
        viewportWidth: vw,
        viewportHeight: vh,
        documentWidth: size.width,
        documentHeight: size.height,
        deviceClass: deviceClass(vw),
        elementKey: safe?.key,
        elementLabel: safe?.label,
        elementTag: safe?.tag,
        elementRole: safe?.role,
        elementOffsetX: rect && rect.width ? Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) : undefined,
        elementOffsetY: rect && rect.height ? Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)) : undefined,
        positionContext: safe?.positionContext,
        probableDeadClick: dead,
        deadClickReason: deadReason,
      };
      interactions.push(interaction);
      return interaction;
    }

    function onClick(event: PointerEvent) {
      if (event.button !== 0 || !safeElement(event.target)) return;
      const safe = safeElement(event.target)!;
      const interactive = !!safe.node.closest("a[href],button,[role='button'],[role='link'],summary");
      const beforeUrl = location.href;
      const beforeMutation = mutationVersion;
      const repeated = recentClick?.key === safe.key && performance.now() - recentClick.at < 900;
      recentClick = { key: safe.key, at: performance.now() };
      const immediateReason = !interactive
        ? "non-interactive element"
        : repeated
          ? "repeated click"
          : undefined;
      const interaction = capturePosition(event, "click", !!immediateReason, immediateReason);
      if (!immediateReason) {
        window.setTimeout(() => {
          if (stopped) return;
          const noAction = location.href === beforeUrl && mutationVersion === beforeMutation;
          if (noAction) {
            interaction.probableDeadClick = true;
            interaction.deadClickReason = "no visible action";
          }
          if (interactions.length >= MAX_EVENTS_PER_FLUSH) void flush();
        }, 850);
      } else if (interactions.length >= MAX_EVENTS_PER_FLUSH) {
        void flush();
      }
    }

    function onMove(event: PointerEvent) {
      if (!movementSampled || moveCount >= MAX_MOVES || event.pointerType === "touch") return;
      const now = performance.now();
      if (now - lastMove < MOVE_MS) return;
      lastMove = now;
      moveCount += 1;
      capturePosition(event, "move");
    }

    function updateScroll() {
      const size = documentSize();
      maxScrollY = Math.max(maxScrollY, Math.round(scrollY));
      maxScrollRatio = Math.max(maxScrollRatio, Math.min(1, (scrollY + innerHeight) / Math.max(size.height, 1)));
    }

    function tick() {
      const now = performance.now();
      const elapsed = Math.min(2000, now - lastTick);
      lastTick = now;
      if (document.visibilityState !== "visible") return;
      activeMs += Math.round(elapsed);
      sections.forEach((state) => { if (state.visible) state.visibleMs += Math.round(elapsed); });
      const size = documentSize();
      const cellX = Math.max(0, Math.min(11, Math.floor(((innerWidth / 2) / Math.max(size.width, 1)) * 12)));
      const cellY = Math.max(0, Math.min(47, Math.floor(((scrollY + innerHeight / 2) / Math.max(size.height, 1)) * 48)));
      const key = `${cellX}:${cellY}`;
      const previous = attention.get(key);
      attention.set(key, { x: cellX, y: cellY, visibleMs: (previous?.visibleMs || 0) + Math.round(elapsed) });
    }

    function makeBatch(completed = false): AnalyticsBatch {
      return {
        session: {
          id: sessionId, startedAt, deviceClass: initialDevice,
          initialViewportWidth, initialViewportHeight,
          movementSampled,
        },
        pageview: {
          id: pageviewId, pathname, startedAt,
          completedAt: completed ? new Date().toISOString() : undefined,
          activeMs, maxScrollY, maxScrollRatio,
          viewportWidth: initialViewportWidth, viewportHeight: initialViewportHeight,
          documentWidth: initialDoc.width, documentHeight: initialDoc.height,
          deviceClass: initialDevice,
        },
        interactions: interactions.splice(0, MAX_EVENTS_PER_FLUSH),
        sections: [...sections.values()].map(({ visible: _visible, ...state }) => state),
        attention: [...attention.values()],
      };
    }

    async function flush(completed = false, beacon = false) {
      if (stopped && !completed) return;
      const batch = makeBatch(completed);
      try {
        const body = JSON.stringify(batch);
        if (beacon && navigator.sendBeacon) {
          navigator.sendBeacon("/api/analytics/ingest", new Blob([body], { type: "application/json" }));
        } else {
          await fetch("/api/analytics/ingest", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
            keepalive: completed,
            credentials: "same-origin",
          });
        }
      } catch {
        // Analytics must never affect the visitor experience.
      }
    }

    function stop() {
      if (stopped) return;
      stopped = true;
      updateScroll();
      void flush(true, true);
      document.removeEventListener("pointerup", onClick, true);
      document.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("pagehide", onPageHide);
      window.clearInterval(flushTimer);
      window.clearInterval(tickTimer);
      sectionObserver.disconnect();
      mutationObserver.disconnect();
    }

    function onPageHide() { stop(); }

    document.addEventListener("pointerup", onClick, true);
    document.addEventListener("pointermove", onMove, { capture: true, passive: true });
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("pagehide", onPageHide);
    const flushTimer = window.setInterval(() => void flush(), FLUSH_MS);
    const tickTimer = window.setInterval(tick, 1000);
    updateScroll();
    stopRef.current = stop;
    return stop;
  }, [loading, pathname, user]);

  return null;
}
