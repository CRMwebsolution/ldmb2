"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, FileDown, FileSpreadsheet, Plus, RefreshCw, Save, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Race, RaceClass, RaceResult, Racer } from "@/lib/supabase/types";
import { buildRaceSavePayload, addBlankRows, prepareRaceEditor, type EditableClass, type EditableResult } from "@/lib/race-editor";
import { computeRaceMetrics, formatPass, hasRecordedPass, isBlankResult, isValidPassInput } from "@/lib/race-results";
import { todayAtTrack } from "@/lib/race-schedule";
import { generateRacePdf } from "@/lib/generate-race-pdf";
import { downloadRaceCsv } from "@/lib/race-csv";

async function fetchRaceEditor(raceId: string) {
  const { data: raceClasses, error: classError } = await supabase.from("classes")
    .select("*").eq("race_id", raceId).order("order_num", { ascending: true });
  if (classError) throw classError;
  const ids = (raceClasses || []).map((cls) => cls.id);
  const rows: RaceResult[] = [];
  if (ids.length) {
    for (let start = 0; ; start += 1000) {
      const { data, error } = await supabase.from("results").select("*")
        .in("class_id", ids).order("id").range(start, start + 999);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
  }
  return prepareRaceEditor((raceClasses || []) as RaceClass[], rows);
}

export default function AdminResultsPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState("");
  const [classes, setClasses] = useState<EditableClass[]>([]);
  const [racers, setRacers] = useState<Racer[]>([]);
  const [staleBlankIds, setStaleBlankIds] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [loadingRaces, setLoadingRaces] = useState(true);
  const [loadingEditor, setLoadingEditor] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [reload, setReload] = useState(0);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    supabase.from("races").select("*").order("date", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setMessage({ error: true, text: `Could not load races: ${error.message}` });
          setLoadingEditor(false);
        }
        else {
          const events = data || [];
          setRaces(events);
          const today = todayAtTrack();
          setSelectedRaceId(events.find((race) => race.date <= today)?.id || events.at(-1)?.id || "");
          if (!events.length) setLoadingEditor(false);
        }
        setLoadingRaces(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    supabase.from("racers").select("*").order("display_name").then(({ data, error }) => {
      if (!active) return;
      if (error) console.error("Could not load racer identities", error);
      else setRacers(data || []);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedRaceId) return;
    let active = true;
    fetchRaceEditor(selectedRaceId).then(({ classes: loaded, staleBlankIds: blanks }) => {
      if (!active) return;
      setClasses(loaded);
      setStaleBlankIds(blanks);
      setCollapsed(loaded.slice(1).map((cls) => cls.id));
      setDirty(false);
    }).catch((error) => {
      console.error("Race editor load failed", error);
      if (active) setMessage({ error: true, text: "Race entries could not be loaded. Try Refresh." });
    }).finally(() => { if (active) setLoadingEditor(false); });
    return () => { active = false; };
  }, [selectedRaceId, reload]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const selectedRace = races.find((race) => race.id === selectedRaceId);
  const hasPendingChanges = dirty || staleBlankIds.length > 0;

  function selectRace(id: string) {
    if (id === selectedRaceId || saving) return;
    if (dirty && !confirm("Discard unsaved race entries and switch events?")) return;
    setClasses([]);
    setStaleBlankIds([]);
    setLoadingEditor(true);
    setMessage(null);
    setDirty(false);
    setSelectedRaceId(id);
  }

  const classesRef = useRef<EditableClass[]>(classes);
  classesRef.current = classes;
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>("");

  function changeClass(id: string, patch: Partial<Pick<EditableClass, "name" | "display_mode">>) {
    setClasses((previous) => previous.map((cls) => cls.id === id ? { ...cls, ...patch } : cls));
    setDirty(true);
  }

  function changeRow(classId: string, rowId: string, field: "name" | "first_half" | "second_half" | "racer_id", value: string) {
    setClasses((previous) => previous.map((cls) => cls.id !== classId ? cls : {
      ...cls,
      results: cls.results.map((row) => {
        if (row.id !== rowId) return row;
        const next = { ...row, [field]: field === "racer_id" ? value || null : value } as EditableResult;
        if (field === "first_half" || field === "second_half") Object.assign(next, computeRaceMetrics(next.first_half, next.second_half));
        return next;
      }),
    }));
    setDirty(true);
    setMessage(null);
  }

  async function handleBlurRow(classId: string, rowId: string, explicitRacerId?: string) {
    const cls = classesRef.current.find((c) => c.id === classId);
    if (!cls) return;
    const row = cls.results.find((r) => r.id === rowId);
    if (!row) return;

    const racerIdValue = explicitRacerId !== undefined ? (explicitRacerId || null) : (row.racer_id || null);

    // If completely blank:
    if (isBlankResult(row)) {
      if (row.persisted) {
        setSavingRowId(row.id);
        try {
          const { error } = await supabase.from("results").delete().eq("id", row.id);
          if (error) throw error;
          setClasses((prev) => prev.map((c) => c.id !== classId ? c : {
            ...c,
            results: c.results.map((r) => r.id === row.id ? { ...r, persisted: false } : r),
          }));
          setAutoSaveStatus("Removed empty pass");
        } catch (err: any) {
          console.error("Auto-delete blank failed", err);
        } finally {
          setSavingRowId(null);
        }
      }
      return;
    }

    // Check pass format validation
    if (![row.first_half, row.second_half].every(isValidPassInput)) {
      setMessage({ error: true, text: `Check pass format for "${row.name || "entry"}" (use seconds, feet, or DQ).` });
      return;
    }

    const first = row.first_half?.trim() || null;
    const second = row.second_half?.trim() || null;
    const metrics = computeRaceMetrics(first, second);

    setSavingRowId(row.id);
    setAutoSaveStatus(`Saving pass for ${row.name || "entry"}...`);

    try {
      const payload = {
        id: row.id,
        class_id: classId,
        order_num: row.order_num || 1,
        name: row.name?.trim() || null,
        first_half: first,
        second_half: second,
        fastest: metrics.fastest,
        consistency: metrics.consistency,
        racer_id: racerIdValue,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("results").upsert(payload, { onConflict: "id" });
      if (error) throw error;

      // Mark row as persisted in state
      setClasses((prev) => prev.map((c) => c.id !== classId ? c : {
        ...c,
        results: c.results.map((r) => r.id === row.id ? { ...r, ...payload, persisted: true } : r),
      }));

      setAutoSaveStatus(`Saved pass for ${row.name || "entry"}`);
      setMessage(null);
      setDirty(false);
    } catch (err: any) {
      console.error("Auto-save pass failed", err);
      setMessage({ error: true, text: `Auto-save failed: ${err.message || "Could not save pass"}` });
      setAutoSaveStatus("Error auto-saving");
    } finally {
      setSavingRowId(null);
    }
  }

  async function handleBlurClassName(classId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const { error } = await supabase.from("classes").update({ name: trimmed }).eq("id", classId);
      if (error) throw error;
      setAutoSaveStatus(`Saved class name: ${trimmed}`);
      setDirty(false);
    } catch (err: any) {
      console.error("Save class name failed", err);
    }
  }

  async function handleBlurDisplayMode(classId: string, mode: string) {
    try {
      const { error } = await supabase.from("classes").update({ display_mode: mode }).eq("id", classId);
      if (error) throw error;
      setAutoSaveStatus("Saved scoring mode");
      setDirty(false);
    } catch (err: any) {
      console.error("Save scoring mode failed", err);
    }
  }

  function moveClass(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= classes.length) return;
    setClasses((previous) => {
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  }

  async function saveAll() {
    if (!selectedRace || !hasPendingChanges || saving) return;
    let payload: ReturnType<typeof buildRaceSavePayload>;
    try {
      payload = buildRaceSavePayload(classes, staleBlankIds);
    } catch (error) {
      setMessage({ error: true, text: error instanceof Error ? error.message : "Check the race entries." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.rpc("save_race_workspace", {
        p_race_id: selectedRace.id,
        p_expected_revision: selectedRace.working_revision,
        p_classes: payload.classPayload,
        p_results: payload.resultPayload,
        p_delete_ids: payload.deleteIds,
      });
      if (error) throw error;
      const revision = data?.[0];
      if (revision) {
        setRaces((previous) => previous.map((race) => race.id === selectedRace.id ? {
          ...race,
          working_revision: revision.working_revision,
          published_revision: revision.published_revision,
        } : race));
      }
      setMessage({ error: false, text: `Atomically saved ${payload.resultPayload.length} entries${selectedRace.published ? "; a new immutable published revision was recorded." : " as a draft."}` });
      setLoadingEditor(true);
      setReload((value) => value + 1);
    } catch (error) {
      console.error("Race save failed", error);
      setMessage({ error: true, text: error instanceof Error && /another window|serialization/i.test(error.message) ? "Another window saved this race first. Refresh before retrying so no work is overwritten." : "Nothing was saved because the atomic database transaction failed. You can safely retry." });
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished() {
    if (!selectedRace || saving) return;
    if (dirty) {
      setMessage({ error: true, text: "Save the race entries before changing publication." });
      return;
    }
    const published = !selectedRace.published;
    if (published && !classes.some((cls) => cls.results.some(hasRecordedPass))) {
      setMessage({ error: true, text: "Record at least one named pass before publishing." });
      return;
    }
    if (published && !confirm(`Publish ${selectedRace.name}? Its saved entries will be visible on the public results page.`)) return;
    try {
      const { data, error } = await supabase.rpc("set_race_publication", {
        p_race_id: selectedRace.id,
        p_expected_revision: selectedRace.working_revision,
        p_published: published,
      });
      if (error) throw error;
      const revision = data?.[0];
      setRaces((previous) => previous.map((race) => race.id === selectedRace.id ? {
        ...race,
        published,
        working_revision: revision?.working_revision ?? race.working_revision,
        published_revision: revision?.published_revision ?? race.published_revision,
      } : race));
      setMessage({ error: false, text: published ? "Results are published and an immutable official revision was recorded." : "Results are hidden from the public page; prior official revisions remain in the audit history." });
    } catch (error) {
      console.error("Publication failed", error);
      setMessage({ error: true, text: "Publication could not be updated." });
    }
  }

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveAll();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  });

  function refresh() {
    if (dirty && !confirm("Discard unsaved entries and reload this race?")) return;
    setLoadingEditor(true);
    setMessage(null);
    setReload((value) => value + 1);
  }

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black">Live Race Results</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-fg)" }}>
          Enter passes across every class during the race. Blank rows stay in this editor and are not saved.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={refresh} disabled={!selectedRaceId || loadingEditor || saving}
          className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
        <button type="button" onClick={() => selectedRace && generateRacePdf(selectedRace, classes).catch((error) => {
          console.error("PDF export failed", error);
          setMessage({ error: true, text: "PDF could not be generated." });
        })} disabled={!selectedRace || loadingEditor || saving || !classes.length}
          className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
          <FileDown className="w-4 h-4" /> Export PDF
        </button>
        <button type="button" onClick={() => selectedRace && downloadRaceCsv(selectedRace, classes)}
          disabled={!selectedRace || loadingEditor || saving || !classes.length}
          className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
          <FileSpreadsheet className="w-4 h-4" /> Export CSV
        </button>
        <button type="button" onClick={saveAll} disabled={!hasPendingChanges || !selectedRace || loadingEditor || saving}
          className="rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2"
          style={{ background: "var(--primary)", color: "var(--primary-fg)" }}>
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save All"}
        </button>
      </div>
    </header>

    <div className="rounded-2xl border p-4 flex flex-wrap items-end justify-between gap-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <label className="font-bold text-sm flex-1 min-w-[230px]">Race night
        <select value={selectedRaceId} onChange={(event) => selectRace(event.target.value)} disabled={loadingRaces || saving}
          className="block mt-1 w-full rounded-lg border px-3 py-2" style={{ background: "var(--muted)", borderColor: "var(--border)" }}>
          {!selectedRaceId && <option value="">Select a race</option>}
          {races.map((race) => <option key={race.id} value={race.id}>{race.date} · {race.name} {race.published ? `(Published r${race.published_revision})` : `(Draft r${race.working_revision})`}</option>)}
        </select>
      </label>
      <button type="button" onClick={togglePublished} disabled={!selectedRace || loadingEditor || saving}
        className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-50"
        style={{ borderColor: selectedRace?.published ? "#16a34a" : "var(--border)" }}>
        {selectedRace?.published ? `Published revision ${selectedRace.published_revision} · Hide Results` : `Draft revision ${selectedRace?.working_revision ?? 0} · Publish Results`}
      </button>
    </div>

    <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
      <p role="status" style={{ color: autoSaveStatus.includes("Error") || autoSaveStatus.includes("failed") ? "#dc2626" : "var(--primary)" }}>
        {autoSaveStatus ? `⚡ ${autoSaveStatus}` : dirty ? "Changes entered. Click off or press Tab to auto-save to live site." : "All changes saved live."}
      </p>
      {savingRowId && (
        <span className="text-xs text-amber-600 font-semibold animate-pulse">
          Saving pass live...
        </span>
      )}
    </div>
    {message && <p role={message.error ? "alert" : "status"} className="rounded-lg border p-3 text-sm"
      style={{ borderColor: message.error ? "#dc2626" : "#16a34a" }}>{message.text}</p>}

    {loadingRaces || loadingEditor ? <p>Loading race entries...</p> : !selectedRace ? <p>No races are available yet. Create one in Race Nights.</p> : classes.length === 0 ?
      <div className="rounded-xl border p-6" style={{ borderColor: "var(--border)" }}>
        This race has no classes. <Link href="/admin/races" className="font-bold underline" style={{ color: "var(--primary)" }}>Add active classes in Race Nights</Link>.
      </div> : <div className="space-y-5">
        <p className="text-sm" style={{ color: "var(--muted-fg)" }}>
          Each class starts with 20 editable rows. Use +5 to make room for more drivers. Passes auto-save to the live site as soon as you click off or press Tab.
        </p>
        <fieldset disabled={saving} className="space-y-5">
          {classes.map((cls, classIndex) => {
            const closed = collapsed.includes(cls.id);
            const filled = cls.results.filter((row) => !isBlankResult(row)).length;
            return <section key={cls.id} className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="flex flex-wrap items-center justify-between gap-3 p-4" style={{ background: "var(--muted)" }}>
                <button type="button" onClick={() => setCollapsed((previous) => closed ? previous.filter((id) => id !== cls.id) : [...previous, cls.id])}
                  className="flex items-center gap-2 font-black text-left">
                  {closed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                  <span>{classIndex + 1}. {cls.name} <span className="text-xs font-normal">({filled} entered)</span></span>
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" aria-label={`Move ${cls.name} up`} title="Move class up" disabled={classIndex === 0}
                    onClick={() => moveClass(classIndex, -1)} className="p-2 rounded border disabled:opacity-30" style={{ borderColor: "var(--border)" }}><ArrowUp className="w-4 h-4" /></button>
                  <button type="button" aria-label={`Move ${cls.name} down`} title="Move class down" disabled={classIndex === classes.length - 1}
                    onClick={() => moveClass(classIndex, 1)} className="p-2 rounded border disabled:opacity-30" style={{ borderColor: "var(--border)" }}><ArrowDown className="w-4 h-4" /></button>
                  <select aria-label={`Scoring mode for ${cls.name}`} value={cls.display_mode}
                    onChange={(event) => {
                      const mode = event.target.value as any;
                      changeClass(cls.id, { display_mode: mode });
                      void handleBlurDisplayMode(cls.id, mode);
                    }}
                    className="rounded border px-2 py-1 text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <option value="fastest">Best Pass</option><option value="consistency">Consistency</option><option value="both">Both</option>
                  </select>
                  <button type="button" onClick={() => { setClasses((previous) => previous.map((item) => item.id === cls.id ? addBlankRows(item, 5) : item)); setDirty(true); }}
                    className="rounded border px-2 py-1 text-sm font-bold inline-flex items-center gap-1" style={{ borderColor: "var(--border)" }}>
                    <Plus className="w-4 h-4" /> 5 rows
                  </button>
                </div>
              </div>
              {!closed && <div className="p-4">
                <label className="block text-xs font-bold mb-3">Race class name
                  <input value={cls.name}
                    onChange={(event) => changeClass(cls.id, { name: event.target.value })}
                    onBlur={() => void handleBlurClassName(cls.id, cls.name)}
                    className="block mt-1 rounded border px-3 py-2 w-full max-w-sm" style={{ background: "var(--muted)", borderColor: "var(--border)" }} />
                </label>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead><tr className="text-left" style={{ color: "var(--muted-fg)" }}>
                      <th className="p-2 w-10">#</th><th className="p-2">Racer / Driver</th>
                      <th className="p-2">1st Pass</th><th className="p-2">2nd Pass</th>
                      <th className="p-2">Linked Identity</th><th className="p-2">Best Pass</th><th className="p-2">Consistency</th>
                    </tr></thead>
                    <tbody>{cls.results.map((row, rowIndex) => <tr key={row.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="p-2" style={{ color: "var(--muted-fg)" }}>{rowIndex + 1}</td>
                      {(["name", "first_half", "second_half"] as const).map((field) => <td key={field} className="p-1">
                        <input value={row[field] || ""}
                          onChange={(event) => changeRow(cls.id, row.id, field, event.target.value)}
                          onBlur={() => void handleBlurRow(cls.id, row.id)}
                          aria-label={`${cls.name} row ${rowIndex + 1} ${field === "name" ? "racer" : field === "first_half" ? "first pass" : "second pass"}`}
                          placeholder={field === "name" ? "Name" : "Time, ft, or DQ"}
                          className="w-full rounded border px-2 py-2 font-mono" style={{ background: "var(--surface)", borderColor: "var(--border)" }} />
                      </td>)}
                      <td className="p-1">
                        <select value={row.racer_id || ""}
                          onChange={(event) => {
                            const val = event.target.value;
                            changeRow(cls.id, row.id, "racer_id", val);
                            void handleBlurRow(cls.id, row.id, val);
                          }}
                          aria-label={`Linked identity for ${row.name || `row ${rowIndex + 1}`}`}
                          className="w-full rounded border px-2 py-2 text-xs" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                          <option value="">Unlinked</option>
                          {racers.map((racer) => <option key={racer.id} value={racer.id}>{racer.display_name}</option>)}
                        </select>
                      </td>
                      <td className="p-2 font-mono font-bold">{formatPass(row.fastest)}</td>
                      <td className="p-2 font-mono">{row.consistency == null ? "—" : Number(row.consistency).toFixed(3)}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
              </div>}
            </section>;
          })}
        </fieldset>
        <button type="button" onClick={saveAll} disabled={!hasPendingChanges || saving} className="rounded-lg px-5 py-3 font-bold disabled:opacity-50 inline-flex items-center gap-2"
          style={{ background: "var(--primary)", color: "var(--primary-fg)" }}>
          <Trophy className="w-4 h-4" /> {saving ? "Saving..." : "Save All Race Results"}
        </button>
      </div>}
  </div>;
}
