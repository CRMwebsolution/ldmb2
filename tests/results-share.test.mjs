import test from "node:test";
import assert from "node:assert/strict";
import { buildResultsShareUrls } from "../src/lib/results-share.ts";

test("results QR tracks the requested campaign while keeping the typed link clean", () => {
  const urls = buildResultsShareUrls(
    "https://www.littledoomudbog.com",
    "/race-results/october-race?old=value#results",
  );

  assert.equal(urls.cleanUrl, "https://www.littledoomudbog.com/race-results/october-race");
  assert.equal(urls.displayText, "www.littledoomudbog.com/race-results/october-race");
  assert.equal(
    urls.trackedUrl,
    "https://www.littledoomudbog.com/race-results/october-race?utm_source=local&utm_medium=screen&utm_campaign=results",
  );
});
