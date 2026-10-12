"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Flag, Link2, Plus, Save, Trash2, UserPlus } from "lucide-react";
import { SpectatorQR } from "@/components/SpectatorQR";
import { hasRecordedPass, isBlankResult } from "@/lib/race-results";
import { supabase } from "@/lib/supabase/client";
import type { Race, RaceClass, RaceResult, Racer } from "@/lib/supabase/types";

type DbError = { code?: string; message?: string };

function friendlyError(error: DbError) {
  const message = error.message || "The contestant change could not be saved.";
  if (error.code === "23505" && message.includes("results_class_racer_unique")) {
    return "That verified racer is already registered in this class.";
  }
  if (error.code === "23505") {
    return "That running-order number is already in use for this class.";
  }
  return message;
}

function hasSavedResult(row: RaceResult) {
  return hasRecordedPass(row)
    || [row.first_half, row.second_half, row.fastest].some((value) => !!value?.trim())
    || row.consistency !== null;
}

export default function ContestantRegistrationPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [racers, setRacers] = useState<Racer[]>([]);
  const [classes, setClasses] = useState<RaceClass[]>([]);
  const [rows, setRows] = useState<RaceResult[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState("");
  const [classId, setClassId] = useState("");
  const [racerId, setRacerId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    async function loadSetup() {
      setLoading(true);
      const [raceResponse, racerResponse] = await Promise.all([
        supabase.from("races").select("*").order("date", { ascending: false }),
        supabase.from("racers").select("*").order("display_name"),
      ]);
      if (!active) return;
      if (raceResponse.error || racerResponse.error) {
        setMessage({ error: true, text: "Race registration data could not be loaded." });
      } else {
        const availableRaces = raceResponse.data || [];
        setRaces(availableRaces);
        setRacers(racerResponse.data || []);
        const requested = new URL(window.location.href).searchParams.get("race");
        setSelectedRaceId((current) =>
          current || availableRaces.find((race) => race.id === requested)?.id || availableRaces[0]?.id || ""
        );
      }
      setLoading(false);
    }
    void loadSetup();
    return () => { active = false; };
  }, []);

  async function loadRoster(raceId: string) {
    if (!raceId) {
      setClasses([]);
      setRows([]);
      setClassId("");
      return;
    }

    setLoadingRoster(true);
    const classResponse = await supabase.from("classes").select("*")
      .eq("race_id", raceId).order("order_num", { ascending: true });
    if (classResponse.error) {
      setMessage({ error: true, text: classResponse.error.message });
      setLoadingRoster(false);
      return;
    }

    const raceClasses = classResponse.data || [];
    const ids = raceClasses.map((item) => item.id);
    let contestants: RaceResult[] = [];
    if (ids.length) {
      const resultResponse = await supabase.from("results").select("*")
        .in("class_id", ids).order("order_num", { ascending: true });
      if (resultResponse.error) {
        setMessage({ error: true, text: resultResponse.error.message });
        setLoadingRoster(false);
        return;
      }
      contestants = (resultResponse.data || []).filter((row) => !isBlankResult(row));
    }

    setClasses(raceClasses);
    setRows(contestants);
    setClassId((current) => raceClasses.some((item) => item.id === current)
      ? current
      : raceClasses[0]?.id || "");
    setLoadingRoster(false);
  }

  useEffect(() => {
    void loadRoster(selectedRaceId);
  }, [selectedRaceId]);

  const selectedRace = races.find((race) => race.id === selectedRaceId);
  const grouped = useMemo(() => classes.map((raceClass) => ({
    ...raceClass,
    contestants: rows.filter((row) => row.class_id === raceClass.id),
  })), [classes, rows]);

  function selectIdentity(nextId: string) {
    setRacerId(nextId);
    const identity = racers.find((racer) => racer.id === nextId);
    if (identity) setDisplayName(identity.display_name);
  }

  async function addContestant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRace || !classId || !displayName.trim()) return;
    const parsedOrder = orderNumber ? Number(orderNumber) : null;
    if (parsedOrder !== null && (!Number.isInteger(parsedOrder) || parsedOrder < 1)) {
      setMessage({ error: true, text: "Running order must be a positive whole number." });
      return;
    }

    setSaving(true);
    setMessage(null);
    const { error } = await supabase.rpc("register_race_contestant", {
      p_race_id: selectedRace.id,
      p_class_id: classId,
      p_display_name: displayName.trim(),
      p_order_num: parsedOrder ?? undefined,
      p_racer_id: racerId || undefined,
    });

    if (error) {
      setMessage({ error: true, text: friendlyError(error) });
    } else {
      setDisplayName("");
      setRacerId("");
      setOrderNumber("");
      setMessage({ error: false, text: "Contestant registered and added to the race-results roster." });
      await loadRoster(selectedRace.id);
    }
    setSaving(false);
  }

  async function updateContestant(event: FormEvent<HTMLFormElement>, row: RaceResult) {
    event.preventDefault();
    if (!selectedRace) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("display_name") || "").trim();
    const order = Number(form.get("order_num"));
    const linkedRacer = String(form.get("racer_id") || "");

    if (!name || !Number.isInteger(order) || order < 1) {
      setMessage({ error: true, text: "Enter a contestant name and a positive running-order number." });
      return;
    }

    setBusyId(row.id);
    setMessage(null);
    const { error } = await supabase.rpc("update_race_contestant", {
      p_race_id: selectedRace.id,
      p_result_id: row.id,
      p_display_name: name,
      p_order_num: order,
      p_racer_id: linkedRacer || undefined,
    });
    if (error) {
      setMessage({ error: true, text: friendlyError(error) });
    } else {
      setMessage({ error: false, text: "Contestant registration updated." });
      await loadRoster(selectedRace.id);
    }
    setBusyId("");
  }

  async function removeContestant(row: RaceResult) {
    if (!selectedRace || hasSavedResult(row)) return;
    if (!window.confirm(`Remove ${row.name || "this contestant"} from this race?`)) return;

    setBusyId(row.id);
    setMessage(null);
    const { error } = await supabase.rpc("remove_race_contestant", {
      p_race_id: selectedRace.id,
      p_result_id: row.id,
    });
    if (error) {
      setMessage({ error: true, text: friendlyError(error) });
    } else {
      setMessage({ error: false, text: "Contestant removed from this race." });
      await loadRoster(selectedRace.id);
    }
    setBusyId("");
  }

  const inputClass = "mt-1 w-full rounded-lg border px-3 py-2 text-sm";
  const inputStyle = { background: "var(--muted)", borderColor: "var(--border)" };

  return <div className="space-y-7">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--primary)" }}>
          Race-night roster
        </p>
        <h1 className="mt-1 text-2xl font-black">Contestant Registration</h1>
        <p className="mt-1 max-w-3xl text-sm" style={{ color: "var(--muted-fg)" }}>
          Register contestants before or during race night. They immediately appear in Log Passes &amp; Results with blank pass fields.
        </p>
      </div>
      {selectedRace && <SpectatorQR
        path={`/race-results/${selectedRace.slug || selectedRace.id}`}
        eventName={selectedRace.name}
      />}
    </header>

    {message && <p
      role={message.error ? "alert" : "status"}
      className="rounded-lg border p-3 text-sm"
      style={{ borderColor: message.error ? "#dc2626" : "#16a34a" }}
    >
      {message.text}
    </p>}

    <section className="rounded-2xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <label className="block max-w-xl text-sm font-bold">
        Race night
        <select
          value={selectedRaceId}
          onChange={(event) => setSelectedRaceId(event.target.value)}
          className={inputClass}
          style={inputStyle}
          disabled={loading}
        >
          {!races.length && <option value="">No races available</option>}
          {races.map((race) => <option key={race.id} value={race.id}>
            {race.date} · {race.name} · {race.published ? "published" : "draft"}
          </option>)}
        </select>
      </label>
    </section>

    <section className="rounded-2xl border p-5 space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-start gap-3">
        <Link2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--primary)" }} />
        <div>
          <h2 className="font-black">How racer linking works</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-fg)" }}>
            The displayed race entry keeps the name or number typed for this event. An optional verified racer identity links that entry to the same person across races, even when their displayed name changes. Leaving it unlinked does not affect scoring. Linking never guesses, merges historic names, or rewrites old results.
          </p>
          <Link href="/admin/racers" className="mt-2 inline-block text-sm font-bold underline" style={{ color: "var(--primary)" }}>
            Manage verified racer identities
          </Link>
        </div>
      </div>
    </section>

    <form onSubmit={addContestant} className="rounded-2xl border p-5 space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2">
        <UserPlus className="h-5 w-5" style={{ color: "var(--primary)" }} />
        <h2 className="text-lg font-black">Add a contestant</h2>
      </div>
      {!classes.length ? <p className="text-sm" style={{ color: "var(--muted-fg)" }}>
        Add running classes to this race in <Link href="/admin/races" className="font-bold underline">Race Nights</Link> first.
      </p> : <>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="text-sm font-bold">
            Class
            <select name="class_id" value={classId} onChange={(event) => setClassId(event.target.value)}
              className={inputClass} style={inputStyle} required>
              {classes.map((raceClass) => <option key={raceClass.id} value={raceClass.id}>{raceClass.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold">
            Verified racer identity (optional)
            <select value={racerId} onChange={(event) => selectIdentity(event.target.value)}
              className={inputClass} style={inputStyle}>
              <option value="">Unlinked contestant</option>
              {racers.map((racer) => <option key={racer.id} value={racer.id}>{racer.display_name}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold">
            Racer name / number
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)}
              maxLength={120} required className={inputClass} style={inputStyle} placeholder="Name or race number" />
          </label>
          <label className="text-sm font-bold">
            Running order (optional)
            <input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)}
              type="number" min="1" step="1" className={inputClass} style={inputStyle}
              placeholder="Next available number" />
          </label>
        </div>
        <button disabled={saving || loadingRoster} className="inline-flex items-center gap-2 rounded-lg px-5 py-3 font-bold disabled:opacity-50"
          style={{ background: "var(--primary)", color: "var(--primary-fg)" }}>
          <Plus className="h-4 w-4" /> {saving ? "Registering..." : "Register contestant"}
        </button>
      </>}
    </form>

    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Current race roster</h2>
          <p className="text-sm" style={{ color: "var(--muted-fg)" }}>
            Scored contestants stay protected from removal here. Their passes can be edited in Log Passes &amp; Results.
          </p>
        </div>
        <Link href="/admin/results" className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold"
          style={{ borderColor: "var(--border)" }}>
          <Flag className="h-4 w-4" /> Log passes
        </Link>
      </div>

      {loadingRoster ? <p>Loading contestants...</p> : grouped.length === 0 ? <p>No classes are configured for this race.</p> :
        <div className="space-y-5">{grouped.map((group) => <section key={group.id}
          className="overflow-hidden rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <header className="flex items-center justify-between gap-3 p-4" style={{ background: "var(--muted)" }}>
            <h3 className="font-black">{group.name}</h3>
            <span className="text-xs font-bold">{group.contestants.length} registered</span>
          </header>
          {!group.contestants.length ? <p className="p-4 text-sm" style={{ color: "var(--muted-fg)" }}>No contestants in this class.</p> :
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {group.contestants.map((row) => {
                const scored = hasSavedResult(row);
                return <form key={row.id} onSubmit={(event) => void updateContestant(event, row)}
                  className="grid gap-3 p-4 lg:grid-cols-[minmax(12rem,2fr)_minmax(11rem,1.5fr)_7rem_auto] lg:items-end">
                  <label className="text-xs font-bold">
                    Racer name / number
                    <input name="display_name" defaultValue={row.name || ""} maxLength={120} required
                      className={inputClass} style={inputStyle} />
                  </label>
                  <label className="text-xs font-bold">
                    Verified identity
                    <select name="racer_id" defaultValue={row.racer_id || ""} className={inputClass} style={inputStyle}>
                      <option value="">Unlinked</option>
                      {racers.map((racer) => <option key={racer.id} value={racer.id}>{racer.display_name}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-bold">
                    Run order
                    <input name="order_num" defaultValue={row.order_num || 1} type="number" min="1" step="1" required
                      className={inputClass} style={inputStyle} />
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${scored ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                      {scored ? "Scored" : "Registered"}
                    </span>
                    <button disabled={busyId === row.id} className="rounded-lg border p-2 disabled:opacity-50"
                      style={{ borderColor: "var(--border)" }} title="Save contestant">
                      <Save className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={scored || busyId === row.id}
                      onClick={() => void removeContestant(row)}
                      className="rounded-lg border p-2 text-red-600 disabled:cursor-not-allowed disabled:opacity-25"
                      style={{ borderColor: "var(--border)" }}
                      title={scored ? "Recorded passes must be handled in Log Passes & Results" : "Remove contestant"}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </form>;
              })}
            </div>}
        </section>)}</div>}
    </section>
  </div>;
}
