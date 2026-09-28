import test from "node:test";
import assert from "node:assert/strict";
import {
  computeRaceMetrics, compareBestPass, formatPass, hasRecordedPass,
  isValidPassInput, sortClassResults,
} from "../src/lib/race-results.ts";
import { raceStartIso, todayAtTrack } from "../src/lib/race-schedule.ts";
import { buildRaceSavePayload, prepareRaceEditor } from "../src/lib/race-editor.ts";

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
  assert.equal(isValidPassInput("19DQ"), true);
  assert.equal(isValidPassInput("-"), true);
  assert.equal(hasRecordedPass({ name: "Driver", first_half: "19DQ", second_half: "" }), true);
});

test("race-night Save All keeps blank rows local and removes old stored blanks", () => {
  const { classes, staleBlankIds } = prepareRaceEditor(
    [{ id: "class-1", race_id: "race-1", name: "Unlimited", display_mode: "fastest", order_num: 1 }],
    [
      { id: "blank", class_id: "class-1", name: "", first_half: null, second_half: null, order_num: 1 },
      { id: "racer", class_id: "class-1", name: "Chris R", first_half: "9.082", second_half: "9.019", order_num: 2 },
    ],
  );
  assert.equal(classes[0].results.length, 20);
  assert.deepEqual(staleBlankIds, ["blank"]);
  const payload = buildRaceSavePayload(classes, staleBlankIds);
  assert.equal(payload.resultPayload.length, 1);
  assert.deepEqual(payload.deleteIds, ["blank"]);
  assert.equal(payload.resultPayload[0].fastest, "9.019");
  assert.equal(payload.resultPayload[0].consistency, 0.063);
});

test("legacy no-pass markers survive editing without becoming numeric times", () => {
  const { classes } = prepareRaceEditor(
    [{ id: "class-1", race_id: "race-1", name: "C Class", display_mode: "both", order_num: 1 }],
    [{ id: "racer", class_id: "class-1", name: "Driver", first_half: "4.945", second_half: "-", order_num: 1 }],
  );
  assert.deepEqual(buildRaceSavePayload(classes, []).resultPayload[0], {
    id: "racer", class_id: "class-1", order_num: 1, name: "Driver",
    first_half: "4.945", second_half: "-", fastest: "4.945", consistency: null,
  });
  classes[0].results[0].second_half = "bogus";
  assert.throws(() => buildRaceSavePayload(classes, []), /pass format/);
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
