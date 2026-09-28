"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Race, RaceClass, RaceResult } from "@/lib/supabase/types";
import { computeRaceMetrics, formatPass, hasRecordedPass, isValidPassInput } from "@/lib/race-results";
import {
  Trophy,
  Plus,
  Save,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  Eye,
  RefreshCw,
  Sparkles,
  ArrowUpDown,
  Calculator,
} from "lucide-react";

export default function AdminResultsPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<string>("");
  const [classes, setClasses] = useState<RaceClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [results, setResults] = useState<RaceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);

  // New Pass Entry State
  const [newName, setNewName] = useState("");
  const [newPass1, setNewPass1] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  // In-line editing state
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    first_half: string;
    second_half: string;
  }>({
    name: "",
    first_half: "",
    second_half: "",
  });

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 1. Load races on mount
  const loadRaces = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("races")
        .select("*")
        .order("date", { ascending: false });

      if (data && data.length > 0) {
        setRaces(data);
        if (!selectedRaceId) {
          setSelectedRaceId(data[0].id);
        }
      }
    } catch (err: any) {
      console.error("Error loading races:", err);
      setMessage({ type: "error", text: "Failed to load races." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRaces();
  }, []);

  // 2. Load classes for the selected race
  useEffect(() => {
    if (!selectedRaceId) return;

    async function loadRaceClasses() {
      try {
        const { data, error } = await supabase
          .from("classes")
          .select("*")
          .eq("race_id", selectedRaceId)
          .order("order_num", { ascending: true });

        if (data) {
          setClasses(data);
          if (data.length > 0) {
            setSelectedClassId(data[0].id);
          } else {
            setSelectedClassId("");
            setResults([]);
          }
        }
      } catch (err) {
        console.error("Error loading race classes:", err);
      }
    }

    loadRaceClasses();
  }, [selectedRaceId]);

  // 3. Load results for the selected class
  const loadResults = async () => {
    if (!selectedClassId) {
      setResults([]);
      return;
    }
    setLoadingResults(true);
    try {
      const { data, error } = await supabase
        .from("results")
        .select("*")
        .eq("class_id", selectedClassId)
        .order("order_num", { ascending: true });

      if (data) {
        setResults(data);
      }
    } catch (err) {
      console.error("Error loading results:", err);
    } finally {
      setLoadingResults(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, [selectedClassId]);

  const newMetrics = computeRaceMetrics(newPass1, newPass2);
  const editMetrics = computeRaceMetrics(editFormData.first_half, editFormData.second_half);

  // Add new contestant pass
  const handleAddPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !newName.trim()) return;
    if (![newPass1, newPass2].every(isValidPassInput)) {
      setMessage({ type: "error", text: "Use a time, a distance with ft or ', or DQ for each pass." });
      return;
    }

    setSavingPass(true);
    setMessage(null);

    try {
      const nextOrder = (results.length > 0 ? Math.max(...results.map((r) => r.order_num || 0)) : 0) + 1;
      const metrics = computeRaceMetrics(newPass1, newPass2);
      const { data, error } = await supabase
        .from("results")
        .insert({
          class_id: selectedClassId,
          order_num: nextOrder,
          name: newName.trim(),
          first_half: newPass1.trim() || null,
          second_half: newPass2.trim() || null,
          fastest: metrics.fastest,
          consistency: metrics.consistency,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setResults((prev) => [...prev, data]);
      }

      // Reset form
      setNewName("");
      setNewPass1("");
      setNewPass2("");
      setMessage({ type: "success", text: "Pass logged successfully!" });
    } catch (err: any) {
      console.error("Error logging pass:", err);
      setMessage({ type: "error", text: err.message || "Failed to log pass." });
    } finally {
      setSavingPass(false);
    }
  };

  // Start inline editing
  const startEdit = (result: RaceResult) => {
    setEditingResultId(result.id);
    setEditFormData({
      name: result.name || "",
      first_half: result.first_half || "",
      second_half: result.second_half || "",
    });
  };

  // Save inline edit
  const saveInlineEdit = async (resultId: string) => {
    if (![editFormData.first_half, editFormData.second_half].every(isValidPassInput)) {
      setMessage({ type: "error", text: "Use a time, a distance with ft or ', or DQ for each pass." });
      return;
    }
    try {
      const metrics = computeRaceMetrics(editFormData.first_half, editFormData.second_half);

      const { error } = await supabase
        .from("results")
        .update({
          name: editFormData.name.trim() || null,
          first_half: editFormData.first_half.trim() || null,
          second_half: editFormData.second_half.trim() || null,
          fastest: metrics.fastest,
          consistency: metrics.consistency,
        })
        .eq("id", resultId);

      if (error) throw error;

      setResults((prev) =>
        prev.map((r) =>
          r.id === resultId
            ? {
                ...r,
                name: editFormData.name,
                first_half: editFormData.first_half,
                second_half: editFormData.second_half,
                fastest: metrics.fastest,
                consistency: metrics.consistency,
              }
            : r
        )
      );

      setEditingResultId(null);
      setMessage({ type: "success", text: "Pass updated!" });
    } catch (err: any) {
      alert(`Error updating pass: ${err.message}`);
    }
  };

  // Delete pass
  const handleDeletePass = async (resultId: string, contestantName: string | null) => {
    if (!confirm(`Delete pass for contestant "${contestantName || "Entry"}"?`)) return;

    try {
      const { error } = await supabase.from("results").delete().eq("id", resultId);
      if (error) throw error;
      setResults((prev) => prev.filter((r) => r.id !== resultId));
      setMessage({ type: "success", text: "Pass removed." });
    } catch (err: any) {
      alert(`Error deleting pass: ${err.message}`);
    }
  };

  // Toggle race published state
  const handleTogglePublished = async () => {
    const currentRace = races.find((r) => r.id === selectedRaceId);
    if (!currentRace) return;

    const newPublished = !currentRace.published;
    if (newPublished) {
      const { data: raceClasses, error: classError } = await supabase.from("classes").select("id").eq("race_id", selectedRaceId);
      if (classError) { setMessage({ type: "error", text: classError.message }); return; }
      if (!raceClasses?.length) { setMessage({ type: "error", text: "Add running classes and results before publishing." }); return; }
      let hasEntry = false;
      for (let start = 0; !hasEntry; start += 1000) {
        const { data: entries, error: entriesError } = await supabase.from("results")
          .select("id, name, first_half, second_half")
          .in("class_id", raceClasses.map((item) => item.id)).order("id").range(start, start + 999);
        if (entriesError) { setMessage({ type: "error", text: entriesError.message }); return; }
        hasEntry = !!entries?.some(hasRecordedPass);
        if (!entries || entries.length < 1000) break;
      }
      if (!hasEntry) {
        setMessage({ type: "error", text: "There are no completed result entries to publish." });
        return;
      }
      if (!confirm(`Publish results for ${currentRace.name}? The public site will show these entries immediately.`)) return;
    }
    try {
      const { error } = await supabase
        .from("races")
        .update({ published: newPublished })
        .eq("id", selectedRaceId);

      if (error) throw error;

      setRaces((prev) =>
        prev.map((r) => (r.id === selectedRaceId ? { ...r, published: newPublished } : r))
      );
      setMessage({
        type: "success",
        text: `Race results are now ${newPublished ? "PUBLISHED on public site" : "set to DRAFT (hidden)"}.`,
      });
    } catch (err: any) {
      alert(`Error updating publication state: ${err.message}`);
    }
  };

  const selectedRace = races.find((r) => r.id === selectedRaceId);
  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
            Log Contestant Passes &amp; Times
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted-fg)" }}>
            Record official 1st pass, 2nd pass, fastest runs, and consistency calculations for each driver.
          </p>
        </div>

        {selectedRace && (
          <button
            onClick={handleTogglePublished}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedRace.published
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-amber-600 text-white hover:bg-amber-700"
            }`}
          >
            {selectedRace.published ? "🟢 Published on Live Site" : "⚪ Results in Draft (Click to Publish)"}
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Selectors Bar */}
      <div
        className="rounded-2xl border p-4 grid sm:grid-cols-2 gap-4 shadow-xs"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-amber-600">
            1. Select Race Night
          </label>
          <select
            value={selectedRaceId}
            onChange={(e) => setSelectedRaceId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-sm font-semibold outline-none focus:border-amber-600 cursor-pointer"
            style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            {races.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} Race — {r.date} {r.published ? "(Published)" : "(Draft)"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-amber-600">
            2. Select Class to Score
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={classes.length === 0}
            className="w-full px-3 py-2 rounded-xl border text-sm font-semibold outline-none focus:border-amber-600 cursor-pointer disabled:opacity-50"
            style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            {classes.length === 0 ? (
              <option>No classes assigned to this race night</option>
            ) : (
              classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Scoring: {c.display_mode})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Add Pass Form */}
      {selectedClassId ? (
        <div
          className="rounded-2xl border p-5 shadow-xs"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-600" />
            <h2 className="font-black text-sm" style={{ color: "var(--foreground)" }}>
              Log New Contestant Pass — {selectedClass?.name}
            </h2>
          </div>

          <form onSubmit={handleAddPass} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted-fg)" }}>
                  Driver / Contestant Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe / Truck #44"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-amber-600"
                  style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted-fg)" }}>
                  1st Pass Time / Dist
                </label>
                <input
                  type="text"
                  placeholder="e.g. 14.280 or 108.9'"
                  value={newPass1}
                  onChange={(e) => setNewPass1(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none focus:border-amber-600"
                  style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted-fg)" }}>
                  2nd Pass Time / Dist
                </label>
                <input
                  type="text"
                  placeholder="e.g. 13.910 or 77'"
                  value={newPass2}
                  onChange={(e) => setNewPass2(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none focus:border-amber-600"
                  style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-amber-600">
                  Best Pass
                </label>
                <input
                  type="text"
                  placeholder="e.g. 13.910"
                  value={newMetrics.fastest || ""}
                  readOnly
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold outline-none focus:border-amber-600"
                  style={{ background: "rgba(180,83,9,0.08)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--muted-fg)" }}>
                  Consistency Diff:
                </span>
                <input
                  type="number"
                  step="0.001"
                  placeholder="±0.000"
                  value={newMetrics.consistency ?? ""}
                  readOnly
                  className="w-24 px-2 py-1 rounded-lg border text-xs font-mono outline-none"
                  style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
                <span className="text-[10px]" style={{ color: "var(--muted-fg)" }}>(Auto-computed for time runs)</span>
              </div>

              <button
                type="submit"
                disabled={savingPass}
                className="px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
                style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
              >
                <Plus className="w-3.5 h-3.5" /> {savingPass ? "Logging..." : "Save Contestant Pass"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div
          className="rounded-2xl border p-8 text-center"
          style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--muted-fg)" }}
        >
          No classes selected for this race. Go to the <strong className="text-amber-600">Race Nights</strong> page to select running classes.
        </div>
      )}

      {/* Results Table for Selected Class */}
      {selectedClassId && (
        <div
          className="rounded-2xl border overflow-hidden shadow-sm"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div
            className="p-4 border-b flex items-center justify-between"
            style={{ borderColor: "var(--border)", background: "var(--muted)" }}
          >
            <div>
              <h3 className="font-black text-sm" style={{ color: "var(--foreground)" }}>
                Logged Passes for {selectedClass?.name} ({results.length} Drivers)
              </h3>
              <p className="text-[11px]" style={{ color: "var(--muted-fg)" }}>
                Click edit to modify pass times or delete to remove.
              </p>
            </div>
            <button
              onClick={loadResults}
              className="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5"
              style={{ borderColor: "var(--border)", color: "var(--muted-fg)" }}
              title="Refresh passes"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {loadingResults ? (
            <div className="py-12 text-center text-xs" style={{ color: "var(--muted-fg)" }}>
              Loading passes...
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-xs" style={{ color: "var(--muted-fg)" }}>
              No passes logged yet for this class. Use the entry form above to log passes.
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {/* Header row */}
              <div
                className="grid gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  color: "var(--muted-fg)",
                  gridTemplateColumns: "40px 1.5fr 1fr 1fr 1fr 1fr 80px",
                }}
              >
                <span>#</span>
                <span>Driver</span>
                <span className="text-right">Pass 1</span>
                <span className="text-right">Pass 2</span>
                <span className="text-right text-amber-600">Best Pass</span>
                <span className="text-right">Consistency</span>
                <span className="text-right">Actions</span>
              </div>

              {/* Data rows */}
              {results.map((res, idx) => {
                const isEditing = editingResultId === res.id;

                if (isEditing) {
                  return (
                    <div
                      key={res.id}
                      className="p-3 bg-amber-500/10 grid gap-2 items-center"
                      style={{ gridTemplateColumns: "40px 1.5fr 1fr 1fr 1fr 1fr 80px" }}
                    >
                      <span className="text-xs font-bold text-center">#{idx + 1}</span>
                      <input
                        type="text"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="px-2 py-1 rounded border text-xs outline-none"
                        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                      />
                      <input
                        type="text"
                        value={editFormData.first_half}
                        onChange={(e) => setEditFormData({ ...editFormData, first_half: e.target.value })}
                        className="px-2 py-1 rounded border text-xs font-mono text-right outline-none"
                        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                      />
                      <input
                        type="text"
                        value={editFormData.second_half}
                        onChange={(e) => setEditFormData({ ...editFormData, second_half: e.target.value })}
                        className="px-2 py-1 rounded border text-xs font-mono text-right outline-none"
                        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                      />
                      <input
                        type="text"
                        value={editMetrics.fastest || ""}
                        readOnly
                        className="px-2 py-1 rounded border text-xs font-mono font-bold text-right outline-none"
                        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                      />
                      <input
                        type="text"
                        value={editMetrics.consistency ?? ""}
                        readOnly
                        className="px-2 py-1 rounded border text-xs font-mono text-right outline-none"
                        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                      />
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => saveInlineEdit(res.id)}
                          className="p-1.5 rounded bg-emerald-600 text-white"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingResultId(null)}
                          className="p-1.5 rounded border"
                          style={{ borderColor: "var(--border)" }}
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={res.id}
                    className="grid gap-2 px-4 py-3 items-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    style={{ gridTemplateColumns: "40px 1.5fr 1fr 1fr 1fr 1fr 80px" }}
                  >
                    <span className="text-xs font-bold text-amber-600">#{idx + 1}</span>
                    <span className="font-bold text-xs" style={{ color: "var(--foreground)" }}>
                      {res.name || "Unnamed Driver"}
                    </span>
                    <span className="text-right text-xs font-mono" style={{ color: "var(--muted-fg)" }}>
                      {formatPass(res.first_half)}
                    </span>
                    <span className="text-right text-xs font-mono" style={{ color: "var(--muted-fg)" }}>
                      {formatPass(res.second_half)}
                    </span>
                    <span className="text-right text-xs font-mono font-black text-amber-600">
                      {formatPass(res.fastest)}
                    </span>
                    <span className="text-right text-xs font-mono" style={{ color: "var(--muted-fg)" }}>
                      {res.consistency !== null ? `±${res.consistency}s` : "—"}
                    </span>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(res)}
                        className="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                        style={{ borderColor: "var(--border)" }}
                        title="Edit pass"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePass(res.id, res.name)}
                        className="p-1.5 rounded-lg border text-red-600 hover:bg-red-500/10 cursor-pointer"
                        style={{ borderColor: "var(--border)" }}
                        title="Delete pass"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
