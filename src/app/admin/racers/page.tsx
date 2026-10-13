"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Racer } from "@/lib/supabase/types";
import {
  buildHistoryResultEntries,
  buildUnlinkedRacerLeaderboard,
  fetchHistoryRows,
  filterRacerLeaderboardByYear,
  formatRaceDate,
  getRacerLeaderboardYears,
  type EstimatedRacerSummary,
  type HistoryResultEntry,
  type HistorySourceRow,
} from "@/lib/estimated-racer-history";

type ActiveTab = "estimated" | "linked";

function resultEntries(summary: EstimatedRacerSummary): HistoryResultEntry[] {
  const entries = summary.classes.flatMap((classHistory) =>
    classHistory.events.flatMap((event) => event.entries)
  );
  return Array.from(
    new Map(entries.map((entry) => [entry.resultId, entry])).values()
  ).sort(
    (a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime() ||
      a.className.localeCompare(b.className)
  );
}

function messageForError(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    return "That identity already exists, or the selected entries would put the same racer in one class twice.";
  }
  if (error.code === "23503") {
    return "One of those entries is already linked to another racer. Reload and review the selections.";
  }
  if (error.code === "42501") return "Race admin access is required.";
  return error.message;
}

function EntryChecklist({
  entries,
  selectedIds,
  onToggle,
  emptyMessage,
}: {
  entries: HistoryResultEntry[];
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  emptyMessage: string;
}) {
  if (entries.length === 0) {
    return <p className="rounded-lg border p-4 text-sm" style={{ borderColor: "var(--border)" }}>{emptyMessage}</p>;
  }

  return <div className="max-h-[52vh] overflow-y-auto rounded-xl border divide-y" style={{ borderColor: "var(--border)" }}>
    {entries.map((entry) => <label key={entry.resultId} className="flex items-start gap-3 p-3 cursor-pointer hover:bg-black/5">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4"
        checked={selectedIds.has(entry.resultId)}
        onChange={(event) => onToggle(entry.resultId, event.target.checked)}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap justify-between gap-x-4">
          <span className="font-bold" style={{ color: "var(--foreground)" }}>{entry.raceName}</span>
          <time dateTime={entry.date} className="font-semibold">{formatRaceDate(entry.date)}</time>
        </span>
        <span className="block text-xs mt-1" style={{ color: "var(--muted-fg)" }}>
          {entry.className} · recorded as {entry.recordedName}
        </span>
      </span>
    </label>)}
  </div>;
}

export default function RacerHistoryPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("estimated");
  const [identities, setIdentities] = useState<Racer[]>([]);
  const [historyRows, setHistoryRows] = useState<HistorySourceRow[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [candidateReview, setCandidateReview] = useState<EstimatedRacerSummary | null>(null);
  const [candidateSelected, setCandidateSelected] = useState<Set<string>>(new Set());
  const [candidateTarget, setCandidateTarget] = useState("new");
  const [candidateName, setCandidateName] = useState("");
  const [editingRacer, setEditingRacer] = useState<Racer | null>(null);
  const [editName, setEditName] = useState("");
  const [editSelected, setEditSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const estimated = useMemo(
    () => buildUnlinkedRacerLeaderboard(historyRows),
    [historyRows]
  );

  const allLinkedEntries = useMemo(
    () => buildHistoryResultEntries(historyRows).filter((entry) => entry.racerId),
    [historyRows]
  );

  const linkedEntriesByRacer = useMemo(() => {
    const groups = new Map<string, HistoryResultEntry[]>();
    for (const entry of allLinkedEntries) {
      if (!entry.racerId) continue;
      const current = groups.get(entry.racerId) ?? [];
      current.push(entry);
      groups.set(entry.racerId, current);
    }
    return groups;
  }, [allLinkedEntries]);

  async function load() {
    setLoading(true);
    try {
      const [{ data: racers, error: racerError }, rows] = await Promise.all([
        supabase.from("racers").select("*").order("display_name"),
        fetchHistoryRows(supabase),
      ]);
      if (racerError) throw racerError;
      setIdentities(racers || []);
      setHistoryRows(rows);
      const seasons = getRacerLeaderboardYears(buildUnlinkedRacerLeaderboard(rows));
      setYear((current) => current ?? seasons[0] ?? null);
    } catch (error) {
      console.error("Racer history failed", error);
      setMessage("Racer history could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function addRacer(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setMessage("");
    const { error } = await supabase.rpc("create_racer_identity", {
      p_display_name: name,
      p_result_ids: [],
    });
    if (error) setMessage(messageForError(error));
    else {
      setNewName("");
      setMessage("Racer identity created. You can link historic entries from the Estimated Matches tab.");
      await load();
    }
    setBusy(false);
  }

  function openCandidateReview(racer: EstimatedRacerSummary) {
    const entries = resultEntries(racer);
    setCandidateReview(racer);
    setCandidateSelected(new Set(entries.map((entry) => entry.resultId)));
    setCandidateTarget("new");
    setCandidateName(racer.displayName);
    setMessage("");
  }

  function toggleCandidate(id: string, checked: boolean) {
    setCandidateSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function linkCandidate() {
    if (!candidateReview || candidateSelected.size === 0) return;
    setBusy(true);
    setMessage("");
    const ids = Array.from(candidateSelected);
    const response = candidateTarget === "new"
      ? await supabase.rpc("create_racer_identity", {
          p_display_name: candidateName.trim(),
          p_result_ids: ids,
        })
      : await supabase.rpc("link_race_results_to_racer", {
          p_racer_id: candidateTarget,
          p_result_ids: ids,
        });

    if (response.error) {
      setMessage(messageForError(response.error));
    } else {
      const leftBehind = resultEntries(candidateReview).length - ids.length;
      setCandidateReview(null);
      setMessage(
        "Linked " + ids.length + " result " + (ids.length === 1 ? "entry" : "entries") +
        ". " + (leftBehind > 0
          ? leftBehind + " unchecked " + (leftBehind === 1 ? "entry remains" : "entries remain") + " available as a separate estimated identity."
          : "No result rows were deleted.")
      );
      await load();
    }
    setBusy(false);
  }

  function openEdit(racer: Racer) {
    const entries = linkedEntriesByRacer.get(racer.id) ?? [];
    setEditingRacer(racer);
    setEditName(racer.display_name);
    setEditSelected(new Set(entries.map((entry) => entry.resultId)));
    setMessage("");
  }

  function toggleEdit(id: string, checked: boolean) {
    setEditSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function saveIdentity() {
    if (!editingRacer || !editName.trim()) return;
    setBusy(true);
    setMessage("");
    const originalCount = (linkedEntriesByRacer.get(editingRacer.id) ?? []).length;
    const { error } = await supabase.rpc("save_racer_identity", {
      p_racer_id: editingRacer.id,
      p_display_name: editName.trim(),
      p_result_ids: Array.from(editSelected),
    });
    if (error) {
      setMessage(messageForError(error));
    } else {
      const unlinked = Math.max(0, originalCount - editSelected.size);
      setEditingRacer(null);
      setMessage(
        "Racer identity saved. " +
        (unlinked > 0
          ? unlinked + " unchecked " + (unlinked === 1 ? "entry was" : "entries were") + " unlinked and returned to Estimated Matches."
          : "All result rows remain intact.")
      );
      await load();
    }
    setBusy(false);
  }

  async function removeRacer(racer: Racer) {
    const linkedCount = (linkedEntriesByRacer.get(racer.id) ?? []).length;
    const confirmed = confirm(
      "Delete the racer identity \"" + racer.display_name + "\"?\n\n" +
      linkedCount + " linked result " + (linkedCount === 1 ? "entry will" : "entries will") +
      " be unlinked, but every result row and all pass data will stay in the Results tab."
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.rpc("delete_racer_identity", {
      p_racer_id: racer.id,
    });
    if (error) setMessage(messageForError(error));
    else {
      setMessage(
        "Identity deleted. " + (data ?? linkedCount) +
        " result " + ((data ?? linkedCount) === 1 ? "entry was" : "entries were") +
        " preserved and returned to Estimated Matches."
      );
      await load();
    }
    setBusy(false);
  }

  const years = getRacerLeaderboardYears(estimated);
  const shown = useMemo(
    () => year === null ? estimated : filterRacerLeaderboardByYear(estimated, year),
    [estimated, year]
  );
  const candidateEntries = candidateReview ? resultEntries(candidateReview) : [];
  const editingEntries = editingRacer
    ? linkedEntriesByRacer.get(editingRacer.id) ?? []
    : [];

  return <div className="space-y-6">
    <header>
      <h1 className="text-2xl font-black">Racer History</h1>
      <p className="text-sm mt-1" style={{ color: "var(--muted-fg)" }}>
        Turn estimated historic names into exact racer identities without changing or deleting race results.
      </p>
    </header>

    {message && <p role="status" className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--border)" }}>{message}</p>}

    <div role="tablist" aria-label="Racer history sections" className="grid grid-cols-2 gap-2 rounded-xl border p-1" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <button
        role="tab"
        aria-selected={activeTab === "estimated"}
        type="button"
        onClick={() => setActiveTab("estimated")}
        className="rounded-lg px-3 py-2 text-sm font-black"
        style={activeTab === "estimated" ? { background: "var(--primary)", color: "var(--primary-fg)" } : undefined}
      >
        Historic Estimated Matches
      </button>
      <button
        role="tab"
        aria-selected={activeTab === "linked"}
        type="button"
        onClick={() => setActiveTab("linked")}
        className="rounded-lg px-3 py-2 text-sm font-black"
        style={activeTab === "linked" ? { background: "var(--primary)", color: "var(--primary-fg)" } : undefined}
      >
        Linked Racers ({identities.length})
      </button>
    </div>

    {activeTab === "estimated" && <section role="tabpanel" className="space-y-4">
      <div>
        <h2 className="text-xl font-black">Historic estimated matches</h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted-fg)" }}>
          Only unlinked results appear here. Review every suggested race before linking. Unchecked races stay unlinked and remain available as their own estimated identity.
        </p>
      </div>
      <label className="block text-sm font-bold max-w-xs">Season
        <select
          className="block mt-1 w-full rounded-lg border p-2"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          value={year ?? "all"}
          onChange={(event) => setYear(event.target.value === "all" ? null : Number(event.target.value))}
        >
          <option value="all">All years</option>
          {years.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        {loading ? <p className="p-5">Loading…</p> : shown.length === 0 ? <p className="p-5">No unlinked historic racer entries found.</p> : shown.map((racer, index) => <details key={racer.key} className="border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
          <summary className="cursor-pointer p-4 flex justify-between gap-3">
            <span className="font-bold">{index + 1}. {racer.displayName}</span>
            <span className="font-mono text-sm">{racer.totalEvents} {racer.totalEvents === 1 ? "race" : "races"}</span>
          </summary>
          <div className="px-4 pb-4 text-sm" style={{ color: "var(--muted-fg)" }}>
            {racer.recordedNames.length > 1 && <p>Estimated group includes: {racer.recordedNames.join(", ")}</p>}
            <button
              type="button"
              onClick={() => openCandidateReview(racer)}
              className="mt-3 rounded-lg px-4 py-2 font-bold"
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
            >
              Review races & link driver
            </button>
            {racer.classes.map((cls) => <section key={cls.className} className="mt-3 rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
              <h3 className="font-bold" style={{ color: "var(--foreground)" }}>{cls.className} · {cls.events.length} {cls.events.length === 1 ? "race" : "races"}</h3>
              <ul className="mt-2 space-y-2">{cls.events.map((event) => <li key={event.raceId} className="flex flex-wrap justify-between gap-x-4 border-t pt-2" style={{ borderColor: "var(--border)" }}>
                <span>{event.raceName} <span className="text-xs">(recorded as {event.recordedNames.join(", ")})</span></span>
                <time dateTime={event.date} className="font-semibold">{formatRaceDate(event.date)}</time>
              </li>)}</ul>
            </section>)}
          </div>
        </details>)}
      </div>
    </section>}

    {activeTab === "linked" && <section role="tabpanel" className="rounded-2xl border p-5 space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5" style={{ color: "var(--primary)" }} />
        <div>
          <h2 className="font-black text-lg">Linked racers</h2>
          <p className="text-sm" style={{ color: "var(--muted-fg)" }}>
            Add or rename identities, review their exact races, unlink mistakes, or remove an identity. Removing an identity never removes its results.
          </p>
        </div>
      </div>
      <form onSubmit={addRacer} className="flex flex-col sm:flex-row gap-2">
        <label className="flex-1 text-sm font-bold">Display name
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            maxLength={120}
            required
            className="mt-1 w-full rounded-lg border px-3 py-2"
            style={{ background: "var(--muted)", borderColor: "var(--border)" }}
            placeholder="Racer / driver name"
          />
        </label>
        <button disabled={busy || !newName.trim()} className="sm:self-end rounded-lg px-4 py-2 font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "var(--primary)", color: "var(--primary-fg)" }}>
          <Plus className="w-4 h-4" /> Add identity
        </button>
      </form>

      {loading ? <p>Loading…</p> : identities.length === 0 ? <p className="text-sm">No linked racer identities yet.</p> :
        <div className="grid gap-3 sm:grid-cols-2">
          {identities.map((racer) => {
            const count = (linkedEntriesByRacer.get(racer.id) ?? []).length;
            return <article key={racer.id} className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--border)" }}>
              <div>
                <p className="font-bold">{racer.display_name}</p>
                <p className="text-xs" style={{ color: "var(--muted-fg)" }}>{count} linked result {count === 1 ? "entry" : "entries"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(racer)}
                  className="rounded-lg border px-3 py-2 text-sm font-bold"
                  style={{ borderColor: "var(--border)" }}
                >
                  View / edit links
                </button>
                <button
                  type="button"
                  onClick={() => void removeRacer(racer)}
                  disabled={busy}
                  className="rounded-lg border border-red-300 px-3 py-2 text-sm font-bold text-red-700 inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" /> Delete identity
                </button>
              </div>
            </article>;
          })}
        </div>}
    </section>}

    {candidateReview && <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="candidate-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/65 p-3 sm:p-6"
      onMouseDown={() => !busy && setCandidateReview(null)}
    >
      <div
        className="mx-auto max-w-3xl rounded-2xl border p-4 sm:p-6 space-y-4 shadow-2xl"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="candidate-title" className="text-xl font-black">Review races for {candidateReview.displayName}</h2>
            <p className="text-sm mt-1" style={{ color: "var(--muted-fg)" }}>
              Uncheck any race that belongs to a different person. Those entries will stay in Results and return to Estimated Matches separately.
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={() => setCandidateReview(null)} disabled={busy} className="p-2"><X className="w-5 h-5" /></button>
        </div>

        <EntryChecklist
          entries={candidateEntries}
          selectedIds={candidateSelected}
          onToggle={toggleCandidate}
          emptyMessage="No unlinked result entries are available."
        />

        <label className="block text-sm font-bold">Link selected entries to
          <select
            className="mt-1 w-full rounded-lg border p-2"
            style={{ background: "var(--muted)", borderColor: "var(--border)" }}
            value={candidateTarget}
            onChange={(event) => setCandidateTarget(event.target.value)}
          >
            <option value="new">Create a new racer identity</option>
            {identities.map((racer) => <option key={racer.id} value={racer.id}>Existing: {racer.display_name}</option>)}
          </select>
        </label>

        {candidateTarget === "new" && <label className="block text-sm font-bold">New identity name
          <input
            value={candidateName}
            onChange={(event) => setCandidateName(event.target.value)}
            maxLength={120}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            style={{ background: "var(--muted)", borderColor: "var(--border)" }}
          />
        </label>}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => setCandidateReview(null)} disabled={busy} className="rounded-lg border px-4 py-2 font-bold" style={{ borderColor: "var(--border)" }}>Cancel</button>
          <button
            type="button"
            onClick={() => void linkCandidate()}
            disabled={busy || candidateSelected.size === 0 || (candidateTarget === "new" && !candidateName.trim())}
            className="rounded-lg px-4 py-2 font-bold disabled:opacity-50"
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            {busy ? "Saving…" : "Link " + candidateSelected.size + " selected"}
          </button>
        </div>
      </div>
    </div>}

    {editingRacer && <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-racer-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/65 p-3 sm:p-6"
      onMouseDown={() => !busy && setEditingRacer(null)}
    >
      <div
        className="mx-auto max-w-3xl rounded-2xl border p-4 sm:p-6 space-y-4 shadow-2xl"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="edit-racer-title" className="text-xl font-black">Edit linked racer</h2>
            <p className="text-sm mt-1" style={{ color: "var(--muted-fg)" }}>
              Rename the identity or uncheck races that belong to someone else. Unchecked rows return to Estimated Matches; no result data is deleted.
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={() => setEditingRacer(null)} disabled={busy} className="p-2"><X className="w-5 h-5" /></button>
        </div>

        <label className="block text-sm font-bold">Identity name
          <input
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            maxLength={120}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            style={{ background: "var(--muted)", borderColor: "var(--border)" }}
          />
        </label>

        <div>
          <p className="text-sm font-bold mb-2">Linked race entries</p>
          <EntryChecklist
            entries={editingEntries}
            selectedIds={editSelected}
            onToggle={toggleEdit}
            emptyMessage="This identity does not have any linked results yet."
          />
        </div>

        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          Saving can unlink unchecked entries, but it cannot delete result rows, pass times, classes, or scoring data.
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => setEditingRacer(null)} disabled={busy} className="rounded-lg border px-4 py-2 font-bold" style={{ borderColor: "var(--border)" }}>Cancel</button>
          <button
            type="button"
            onClick={() => void saveIdentity()}
            disabled={busy || !editName.trim()}
            className="rounded-lg px-4 py-2 font-bold disabled:opacity-50"
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            {busy ? "Saving…" : "Save identity & links"}
          </button>
        </div>
      </div>
    </div>}
  </div>;
}
