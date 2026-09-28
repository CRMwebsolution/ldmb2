"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Race, ClassCatalog, RaceClass } from "@/lib/supabase/types";
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  Check,
  X,
  AlertCircle,
  Flag,
  FileText,
  ChevronRight,
  Sparkles,
  Save,
} from "lucide-react";

export default function AdminRacesPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [catalog, setCatalog] = useState<ClassCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  // Create / Edit Race Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRace, setEditingRace] = useState<Race | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    special_label: "",
    event_status: "scheduled" as Race["event_status"],
    show_on_schedule: true,
    published: false,
    pdf_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Class Selection Modal / Drawer for Race Night
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [activeRaceForClasses, setActiveRaceForClasses] = useState<Race | null>(null);
  const [raceClasses, setRaceClasses] = useState<RaceClass[]>([]);
  const [loadingRaceClasses, setLoadingRaceClasses] = useState(false);
  const [savingClasses, setSavingClasses] = useState(false);

  // Quick Add Class to Catalog inside the race selector
  const [showQuickAddClass, setShowQuickAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassFee, setNewClassFee] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [racesRes, catalogRes] = await Promise.all([
        supabase.from("races").select("*").order("date", { ascending: false }),
        supabase.from("class_catalog").select("*").order("sort_order", { ascending: true }),
      ]);

      if (racesRes.data) setRaces(racesRes.data);
      if (catalogRes.data) setCatalog(catalogRes.data);
    } catch (err: any) {
      console.error("Error loading races data:", err);
      setMessage({ type: "error", text: "Failed to load races from database." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingRace(null);
    setFormData({
      name: "",
      date: new Date().toISOString().split("T")[0],
      special_label: "",
      event_status: "scheduled",
      show_on_schedule: true,
      published: false,
      pdf_url: "",
    });
    setModalOpen(true);
    setMessage(null);
  };

  const openEditModal = (race: Race) => {
    setEditingRace(race);
    setFormData({
      name: race.name,
      date: race.date,
      special_label: race.special_label || "",
      event_status: race.event_status,
      show_on_schedule: race.show_on_schedule,
      published: race.published || false,
      pdf_url: race.pdf_url || "",
    });
    setModalOpen(true);
    setMessage(null);
  };

  const handleSaveRace = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      if (editingRace) {
        // Update race
        const { error } = await supabase
          .from("races")
          .update({
            name: formData.name,
            date: formData.date,
            special_label: formData.special_label || null,
            event_status: formData.event_status,
            show_on_schedule: formData.show_on_schedule,
            published: formData.published,
            pdf_url: formData.pdf_url || null,
          })
          .eq("id", editingRace.id);

        if (error) throw error;
        setMessage({ type: "success", text: "Race updated successfully!" });
      } else {
        // Insert new race
        const { data, error } = await supabase
          .from("races")
          .insert({
            name: formData.name,
            date: formData.date,
            special_label: formData.special_label || null,
            event_status: formData.event_status,
            show_on_schedule: formData.show_on_schedule,
            published: formData.published,
            pdf_url: formData.pdf_url || null,
          })
          .select()
          .single();

        if (error) throw error;
        setMessage({ type: "success", text: "New race created successfully!" });
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error("Save race error:", err);
      setMessage({ type: "error", text: err.message || "Failed to save race." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRace = async (raceId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the race "${name}"? This will delete associated race class entries.`)) {
      return;
    }

    try {
      const { error } = await supabase.from("races").delete().eq("id", raceId);
      if (error) throw error;
      setMessage({ type: "success", text: "Race deleted successfully." });
      await loadData();
    } catch (err: any) {
      console.error("Delete race error:", err);
      setMessage({ type: "error", text: err.message || "Failed to delete race." });
    }
  };

  // Open Race Night Class Selection
  const openClassSelector = async (race: Race) => {
    setActiveRaceForClasses(race);
    setClassModalOpen(true);
    setLoadingRaceClasses(true);
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("race_id", race.id)
        .order("order_num", { ascending: true });

      if (error) throw error;
      setRaceClasses(data || []);
    } catch (err: any) {
      console.error("Error loading race night classes:", err);
    } finally {
      setLoadingRaceClasses(false);
    }
  };

  // Toggle a catalog class in or out of this race night
  const handleToggleCatalogClass = async (cat: ClassCatalog) => {
    if (!activeRaceForClasses) return;
    setSavingClasses(true);

    try {
      const existing = raceClasses.find((rc) => rc.name.toLowerCase() === cat.name.toLowerCase());

      if (existing) {
        // Remove class from race night
        const { error } = await supabase.from("classes").delete().eq("id", existing.id);
        if (error) throw error;
        setRaceClasses((prev) => prev.filter((c) => c.id !== existing.id));
      } else {
        // Add class to race night
        const nextOrder = (raceClasses.length > 0 ? Math.max(...raceClasses.map((c) => c.order_num || 0)) : 0) + 1;
        const { data, error } = await supabase
          .from("classes")
          .insert({
            race_id: activeRaceForClasses.id,
            name: cat.name,
            display_mode: cat.default_display_mode,
            order_num: nextOrder,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setRaceClasses((prev) => [...prev, data]);
        }
      }
    } catch (err: any) {
      console.error("Error toggling class:", err);
      alert(`Error toggling class: ${err.message}`);
    } finally {
      setSavingClasses(false);
    }
  };

  // Add a brand new class to Catalog and immediately assign to this race
  const handleQuickAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !activeRaceForClasses) return;

    try {
      const nextSortOrder = (catalog.length > 0 ? Math.max(...catalog.map((c) => c.sort_order || 0)) : 0) + 1;
      const { data: newCat, error: catErr } = await supabase
        .from("class_catalog")
        .insert({
          name: newClassName.trim(),
          entry_fee: newClassFee.trim() || null,
          sort_order: nextSortOrder,
          default_display_mode: "fastest",
          active: true,
        })
        .select()
        .single();

      if (catErr) throw catErr;

      // Add to catalog local list
      if (newCat) {
        setCatalog((prev) => [...prev, newCat]);
        // Also assign to current race
        const nextOrder = (raceClasses.length > 0 ? Math.max(...raceClasses.map((c) => c.order_num || 0)) : 0) + 1;
        const { data: newRaceClass, error: rcErr } = await supabase
          .from("classes")
          .insert({
            race_id: activeRaceForClasses.id,
            name: newCat.name,
            display_mode: "fastest",
            order_num: nextOrder,
          })
          .select()
          .single();

        if (rcErr) throw rcErr;
        if (newRaceClass) {
          setRaceClasses((prev) => [...prev, newRaceClass]);
        }
      }

      setNewClassName("");
      setNewClassFee("");
      setShowQuickAddClass(false);
    } catch (err: any) {
      alert(`Error adding class: ${err.message}`);
    }
  };

  // Change display mode for a race class
  const handleUpdateDisplayMode = async (classId: string, mode: "fastest" | "consistency" | "both") => {
    try {
      const { error } = await supabase.from("classes").update({ display_mode: mode }).eq("id", classId);
      if (error) throw error;
      setRaceClasses((prev) => prev.map((c) => (c.id === classId ? { ...c, display_mode: mode } : c)));
    } catch (err: any) {
      alert(`Error updating display mode: ${err.message}`);
    }
  };

  const filteredRaces = races.filter((r) => {
    if (statusFilter === "all") return true;
    return r.event_status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
            Race Events &amp; Running Classes
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted-fg)" }}>
            Manage schedule dates, race names, and select which vehicle classes compete each race night.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
          style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
        >
          <Plus className="w-4 h-4" /> Create Race Night
        </button>
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["all", "scheduled", "completed", "postponed", "cancelled"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors"
            style={{
              background: statusFilter === st ? "var(--primary)" : "var(--muted)",
              color: statusFilter === st ? "var(--primary-fg)" : "var(--muted-fg)",
            }}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Races Table */}
      {loading ? (
        <div className="py-12 text-center text-xs" style={{ color: "var(--muted-fg)" }}>
          Loading races from Supabase...
        </div>
      ) : filteredRaces.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--muted-fg)" }}
        >
          No races found. Click &quot;Create Race Night&quot; to add your first event.
        </div>
      ) : (
        <div
          className="rounded-2xl border overflow-hidden shadow-sm"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {filteredRaces.map((race) => {
              const d = new Date(race.date + "T00:00:00");
              return (
                <div
                  key={race.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0"
                      style={{ background: "var(--muted)", color: "var(--primary)" }}
                    >
                      <span className="text-[10px] font-bold uppercase">{d.toLocaleDateString("en-US", { month: "short" })}</span>
                      <span className="text-lg font-black leading-none">{d.getDate()}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-black text-base" style={{ color: "var(--foreground)" }}>
                          {race.name} Race
                        </h2>
                        {race.special_label && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md text-amber-600 bg-amber-500/10">
                            {race.special_label}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            race.event_status === "completed"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : race.event_status === "cancelled"
                              ? "bg-red-500/10 text-red-600"
                              : "bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {race.event_status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs mt-1.5 flex-wrap" style={{ color: "var(--muted-fg)" }}>
                        <span>Date: {race.date}</span>
                        <span>•</span>
                        <span>Schedule: {race.show_on_schedule ? "✅ Visible" : "❌ Hidden"}</span>
                        <span>•</span>
                        <span>Results: {race.published ? "🟢 Published" : "⚪ Draft"}</span>
                        {race.pdf_url && (
                          <>
                            <span>•</span>
                            <a href={race.pdf_url} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline flex items-center gap-0.5">
                              <FileText className="w-3 h-3" /> PDF Flyer
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      onClick={() => openClassSelector(race)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      style={{ background: "rgba(180,83,9,0.12)", color: "var(--primary)" }}
                    >
                      <Layers className="w-3.5 h-3.5" /> Select Running Classes
                    </button>

                    <button
                      onClick={() => openEditModal(race)}
                      className="p-2 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                      title="Edit race details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteRace(race.id, race.name)}
                      className="p-2 rounded-xl border text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
                      style={{ borderColor: "var(--border)" }}
                      title="Delete race"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT RACE MODAL ────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-lg rounded-2xl border p-6 shadow-xl"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black" style={{ color: "var(--foreground)" }}>
                {editingRace ? "Edit Race Night" : "Create Race Night"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: "var(--muted-fg)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRace} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                  Race Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October, Fall Frenzy, Independence Run"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-amber-600"
                  style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                    Race Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-amber-600"
                    style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                    Status *
                  </label>
                  <select
                    value={formData.event_status}
                    onChange={(e) => setFormData({ ...formData, event_status: e.target.value as Race["event_status"] })}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-amber-600"
                    style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="postponed">Postponed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                  Special Label / Badge
                </label>
                <input
                  type="text"
                  placeholder="e.g. Season Finale, Invitation Race, \$5,000 Shootout"
                  value={formData.special_label}
                  onChange={(e) => setFormData({ ...formData, special_label: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-amber-600"
                  style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                  Flyer PDF URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.pdf_url}
                  onChange={(e) => setFormData({ ...formData, pdf_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-amber-600"
                  style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 p-3 rounded-xl border cursor-pointer" style={{ background: "var(--muted)", borderColor: "var(--border)" }}>
                  <input
                    type="checkbox"
                    checked={formData.show_on_schedule}
                    onChange={(e) => setFormData({ ...formData, show_on_schedule: e.target.checked })}
                    className="rounded text-amber-600 w-4 h-4"
                  />
                  <div>
                    <div className="text-xs font-bold" style={{ color: "var(--foreground)" }}>Show on Schedule</div>
                    <div className="text-[10px]" style={{ color: "var(--muted-fg)" }}>Display on public events page</div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border cursor-pointer" style={{ background: "var(--muted)", borderColor: "var(--border)" }}>
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="rounded text-amber-600 w-4 h-4"
                  />
                  <div>
                    <div className="text-xs font-bold" style={{ color: "var(--foreground)" }}>Publish Results</div>
                    <div className="text-[10px]" style={{ color: "var(--muted-fg)" }}>Make passes public on leaderboard</div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
                >
                  <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : editingRace ? "Update Race" : "Create Race"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SELECT RUNNING CLASSES DRAWER / MODAL ─────────────────────────── */}
      {classModalOpen && activeRaceForClasses && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border shadow-xl"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            {/* Header */}
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                  Race Night Class Configuration
                </span>
                <h2 className="text-lg font-black" style={{ color: "var(--foreground)" }}>
                  Classes Running in &quot;{activeRaceForClasses.name}&quot; ({activeRaceForClasses.date})
                </h2>
              </div>
              <button
                onClick={() => setClassModalOpen(false)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: "var(--muted-fg)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {/* Info box */}
              <div
                className="p-3.5 rounded-xl border text-xs"
                style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--muted-fg)" }}
              >
                Click any class below to add or remove it from tonight&apos;s racing bracket. Only selected classes will appear in the pass logger and on the race leaderboard.
              </div>

              {/* Master Catalog Selector */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--foreground)" }}>
                    Select Classes from Catalog ({catalog.length} Available)
                  </h3>
                  <button
                    onClick={() => setShowQuickAddClass(!showQuickAddClass)}
                    className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add New Class
                  </button>
                </div>

                {/* Quick Add Class Form */}
                {showQuickAddClass && (
                  <form
                    onSubmit={handleQuickAddClass}
                    className="mb-4 p-4 rounded-xl border space-y-3"
                    style={{ background: "var(--muted)", borderColor: "var(--border)" }}
                  >
                    <p className="text-xs font-bold" style={{ color: "var(--foreground)" }}>
                      Add Brand New Class to Catalog &amp; Race:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Class Name (e.g. Pro Mod)"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border text-xs outline-none"
                        style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
                      />
                      <input
                        type="text"
                        placeholder="Entry Fee (e.g. \$50)"
                        value={newClassFee}
                        onChange={(e) => setNewClassFee(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border text-xs outline-none"
                        style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowQuickAddClass(false)}
                        className="px-3 py-1 text-xs rounded-md border"
                        style={{ borderColor: "var(--border)", color: "var(--muted-fg)" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 text-xs font-bold rounded-md"
                        style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
                      >
                        Save &amp; Select
                      </button>
                    </div>
                  </form>
                )}

                {/* Grid of Catalog Classes to Toggle */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {catalog.map((cat) => {
                    const isSelected = raceClasses.some((rc) => rc.name.toLowerCase() === cat.name.toLowerCase());
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        disabled={savingClasses}
                        onClick={() => handleToggleCatalogClass(cat)}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? "border-amber-600 bg-amber-500/15 text-foreground"
                            : "hover:bg-black/5 dark:hover:bg-white/5 opacity-70"
                        }`}
                        style={{ borderColor: isSelected ? "var(--primary)" : "var(--border)" }}
                      >
                        <div>
                          <div className="font-bold text-xs" style={{ color: "var(--foreground)" }}>
                            {cat.name}
                          </div>
                          {cat.entry_fee && (
                            <div className="text-[10px]" style={{ color: "var(--muted-fg)" }}>
                              Fee: {cat.entry_fee}
                            </div>
                          )}
                        </div>
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 ${
                            isSelected ? "bg-amber-600 text-white" : "border"
                          }`}
                          style={{ borderColor: "var(--border)" }}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Classes Running Order & Mode */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--foreground)" }}>
                  Running Classes for This Race ({raceClasses.length} Selected)
                </h3>

                {raceClasses.length === 0 ? (
                  <p className="text-xs italic" style={{ color: "var(--muted-fg)" }}>
                    No classes selected yet. Click any class above to include it tonight.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {raceClasses.map((rc, idx) => (
                      <div
                        key={rc.id}
                        className="p-3 rounded-xl border flex items-center justify-between gap-3"
                        style={{ background: "var(--muted)", borderColor: "var(--border)" }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold w-5 text-center text-amber-600">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-xs" style={{ color: "var(--foreground)" }}>
                            {rc.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold" style={{ color: "var(--muted-fg)" }}>
                            Scoring:
                          </span>
                          <select
                            value={rc.display_mode}
                            onChange={(e) => handleUpdateDisplayMode(rc.id, e.target.value as any)}
                            className="px-2 py-1 rounded-md text-xs border outline-none font-semibold"
                            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
                          >
                            <option value="fastest">Fastest</option>
                            <option value="consistency">Consistency</option>
                            <option value="both">Both</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex justify-end" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => setClassModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold"
                style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
