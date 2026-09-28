import test from "node:test";
import assert from "node:assert/strict";
import {
  computeRaceMetrics, compareBestPass, formatPass, hasRecordedPass,
  isValidPassInput, sortClassResults,
} from "../src/lib/race-results.ts";
import { raceStartIso, todayAtTrack } from "../src/lib/race-schedule.ts";

test("completed timed runs beat distances, with the lower time winning", () => {
  assert.equal(compareBestPass("9.900", "200ft"), -1);
  assert.equal(compareBestPass("8.900", "9.900"), -1);
  assert.ok(compareBestPass("125ft", "150ft") > 0);
  assert.equal(compareBestPass("DQ", "125ft"), 1);
});

test("best pass and consistency come only from valid recorded passes", () => {
  assert.deepEqual(computeRaceMetrics("9.082", "9.019"), { fastest: "9.019", consistency: 0.063 });
  assert.deepEqual(computeRaceMetrics("200ft", "120ft"), { fastest: "200ft", consistency: null });
  assert.deepEqual(computeRaceMetrics("DQ", "108.9'"), { fastest: "108.9ft", consistency: null });
  assert.deepEqual(computeRaceMetrics("DQ", ""), { fastest: null, consistency: null });
  assert.equal(formatPass("9.1"), "9.100");
});

test("publishing requires a named recorded pass and rejects malformed new input", () => {
  assert.equal(hasRecordedPass({ name: "Driver", first_half: "", second_half: "" }), false);
  assert.equal(hasRecordedPass({ name: "Driver", first_half: "DQ", second_half: null }), true);
  assert.equal(hasRecordedPass({ name: null, first_half: "9.1", second_half: null }), false);
  assert.equal(isValidPassInput("12.3ft"), true);
  assert.equal(isValidPassInput("DQ"), true);
  assert.equal(isValidPassInput("12.3 furlongs"), false);
});

test("class display mode determines the order without treating entry order as rank", () => {
  const rows = [
    { id: "a", name: "A", first_half: "9.100", second_half: "9.200", fastest: "9.100", consistency: 0.1, order_num: 1 },
    { id: "b", name: "B", first_half: "9.050", second_half: "9.350", fastest: "9.050", consistency: 0.3, order_num: 2 },
    { id: "c", name: "C", first_half: "", second_half: "", fastest: null, consistency: null, order_num: 3 },
    { id: "d", name: "", first_half: "", second_half: "", fastest: null, consistency: null, order_num: 4 },
  ];
  assert.deepEqual(sortClassResults(rows, "fastest").map((row) => row.id), ["b", "a", "c"]);
  assert.deepEqual(sortClassResults(rows, "consistency").map((row) => row.id), ["a", "b", "c"]);
});

test("event day and four o'clock start follow the track timezone across DST", () => {
  assert.equal(todayAtTrack(new Date("2026-10-01T02:00:00Z")), "2026-09-30");
  assert.equal(raceStartIso("2026-10-17"), "2026-10-17T20:00:00.000Z");
  assert.equal(raceStartIso("2026-12-12"), "2026-12-12T21:00:00.000Z");
});
