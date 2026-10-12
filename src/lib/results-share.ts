export const RESULTS_QR_CAMPAIGN = {
  source: "local",
  medium: "screen",
  campaign: "results",
} as const;

export function buildResultsShareUrls(origin: string, path: string) {
  const clean = new URL(path, origin);
  clean.search = "";
  clean.hash = "";

  const tracked = new URL(clean.href);
  tracked.searchParams.set("utm_source", RESULTS_QR_CAMPAIGN.source);
  tracked.searchParams.set("utm_medium", RESULTS_QR_CAMPAIGN.medium);
  tracked.searchParams.set("utm_campaign", RESULTS_QR_CAMPAIGN.campaign);

  return {
    cleanUrl: clean.href,
    trackedUrl: tracked.href,
    displayText: `${clean.host}${clean.pathname}`,
  };
}
