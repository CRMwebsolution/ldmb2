import test from "node:test";
import assert from "node:assert/strict";
import { deviceClass, isTrackablePath, normalizeAnalyticsPath } from "../src/lib/analytics/policy.ts";
import { raceResultsCsv } from "../src/lib/race-csv.ts";

test("analytics route allowlist fails closed around sensitive and unknown pages", () => {
  for (const path of ["/", "/events", "/classes", "/track", "/race-results", "/race-results/records", "/race-results/9-18-26", "/sponsors"]) {
    assert.equal(isTrackablePath(path), true, path);
  }
  for (const path of ["/admin", "/admin/results", "/contact", "/gallery", "/privacy", "/booking", "/checkout", "/login", "/unknown", "/race-results/one/pit"]) {
    assert.equal(isTrackablePath(path), false, path);
  }
  assert.equal(normalizeAnalyticsPath("https://littledoomudbog.com/Events/?utm=private"), "/events");
});

test("device classes follow the website responsive layout bands", () => {
  assert.equal(deviceClass(390), "mobile");
  assert.equal(deviceClass(900), "tablet");
  assert.equal(deviceClass(1440), "desktop");
});

test("CSV export neutralizes spreadsheet formulas and quotes fields", () => {
  const csv = raceResultsCsv(
    { name: "October", date: "2026-10-17" },
    [{
      name: "Unlimited", results: [{
        name: "=HYPERLINK(\"bad\")", first_half: "9.1", second_half: "9.2",
        fastest: "9.1", consistency: 0.1,
      }],
    }],
  );
  assert.match(csv, /"'=HYPERLINK/);
  assert.match(csv, /9\.100/);
  assert.ok(csv.startsWith("\uFEFF"));
});
