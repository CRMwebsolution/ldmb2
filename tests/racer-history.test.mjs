import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHistoryResultEntries,
  buildUnlinkedRacerLeaderboard,
} from "../src/lib/estimated-racer-history.ts";

function historyRow(id, name, racerId, raceId, raceName, date, className = "Unlimited") {
  return {
    id,
    racer_id: racerId,
    name,
    classes: {
      name: className,
      races: { id: raceId, name: raceName, date },
    },
  };
}

function summaryIds(summary) {
  return summary.classes
    .flatMap((classHistory) => classHistory.events)
    .flatMap((event) => event.entries)
    .map((entry) => entry.resultId)
    .sort();
}

test("historic estimates retain exact result IDs for review before linking", () => {
  const rows = [
    historyRow("result-rhett", "Rhett", null, "race-1", "Spring Mud Bog", "2026-05-02"),
    historyRow("result-hinkle", "Rhett Hinkle", null, "race-2", "Summer Mud Bog", "2026-07-11"),
  ];

  const combined = buildUnlinkedRacerLeaderboard(rows);
  assert.equal(combined.length, 1);
  assert.deepEqual(summaryIds(combined[0]), ["result-hinkle", "result-rhett"]);
});

test("linked rows leave the estimate so an unchecked namesake becomes a separate identity", () => {
  const rows = [
    historyRow("result-rhett", "Rhett", "racer-rhett", "race-1", "Spring Mud Bog", "2026-05-02"),
    historyRow("result-hinkle", "Rhett Hinkle", null, "race-2", "Summer Mud Bog", "2026-07-11"),
  ];

  const remaining = buildUnlinkedRacerLeaderboard(rows);
  assert.equal(remaining.length, 1);
  assert.deepEqual(remaining[0].recordedNames, ["Rhett Hinkle"]);
  assert.deepEqual(summaryIds(remaining[0]), ["result-hinkle"]);
});

test("exact linked-entry management includes classes excluded from driver estimates", () => {
  const footRunner = historyRow(
    "result-foot",
    "Runner",
    "racer-runner",
    "race-3",
    "Fall Mud Bog",
    "2026-09-05",
    "Foot Runners"
  );

  assert.equal(buildUnlinkedRacerLeaderboard([footRunner]).length, 0);
  assert.deepEqual(buildHistoryResultEntries([footRunner]).map((entry) => entry.resultId), ["result-foot"]);
});
