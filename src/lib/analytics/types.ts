export type DeviceClass = "desktop" | "tablet" | "mobile";
export type InteractionKind = "click" | "move";

export type AnalyticsInteraction = {
  clientEventId: string;
  kind: InteractionKind;
  offsetMs: number;
  documentX: number;
  documentY: number;
  viewportX: number;
  viewportY: number;
  normalizedX: number;
  normalizedY: number;
  viewportWidth: number;
  viewportHeight: number;
  documentWidth: number;
  documentHeight: number;
  deviceClass: DeviceClass;
  elementKey?: string;
  elementLabel?: string;
  elementTag?: string;
  elementRole?: string;
  elementOffsetX?: number;
  elementOffsetY?: number;
  positionContext?: "document" | "fixed" | "sticky";
  probableDeadClick?: boolean;
  deadClickReason?: string;
};

export type AnalyticsSection = {
  key: string;
  reached: boolean;
  visibleMs: number;
  maxVisibleRatio: number;
  top: number;
  height: number;
};

export type AttentionCell = { x: number; y: number; visibleMs: number };

export type AnalyticsBatch = {
  session: {
    id: string;
    startedAt: string;
    deviceClass: DeviceClass;
    initialViewportWidth: number;
    initialViewportHeight: number;
    movementSampled: boolean;
  };
  pageview: {
    id: string;
    pathname: string;
    startedAt: string;
    completedAt?: string;
    activeMs: number;
    maxScrollY: number;
    maxScrollRatio: number;
    viewportWidth: number;
    viewportHeight: number;
    documentWidth: number;
    documentHeight: number;
    deviceClass: DeviceClass;
  };
  interactions: AnalyticsInteraction[];
  sections: AnalyticsSection[];
  attention: AttentionCell[];
};

export type DashboardPoint = {
  kind: InteractionKind;
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
  documentWidth: number;
  documentHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  viewportX: number;
  viewportY: number;
  elementKey?: string | null;
  elementOffsetX?: number | null;
  elementOffsetY?: number | null;
  positionContext?: string | null;
  dead?: boolean;
};

export type AnalyticsSummary = {
  filters: {
    pathname: string;
    device: DeviceClass | "all";
    version: string;
    spatialVersion: string | null;
    days: number;
  };
  options: {
    pages: string[];
    versions: string[];
  };
  totals: {
    sessions: number;
    pageviews: number;
    clicks: number;
    movements: number;
    deadClicks: number;
    averageScrollDepth: number;
    averageActiveMs: number;
  };
  points: DashboardPoint[];
  scrollRatios: number[];
  attention: { x: number; y: number; visibleMs: number }[];
  sections: {
    key: string;
    sessions: number;
    reachPercent: number;
    averageVisibleMs: number;
    averageMaxVisibleRatio: number;
  }[];
  topElements: { key: string; label: string; clicks: number; deadClicks: number }[];
  deadClickHotspots: { key: string; clicks: number }[];
  scrollBands: { label: string; sessions: number; percent: number }[];
  aiSummary: {
    ctaClicks: { key: string; clicks: number }[];
    deadClickHotspots: { key: string; clicks: number }[];
    sectionReach: { key: string; reachPercent: number; averageVisibleMs: number }[];
    scrollDropOff: { label: string; percent: number }[];
  };
};
