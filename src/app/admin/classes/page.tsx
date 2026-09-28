"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { ClassCatalog } from "@/lib/supabase/types";
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  Save,
  Check,
  X,
  AlertCircle,
  FileText,
  DollarSign,
  ArrowUpDown,
} from "lucide-react";

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassCatalog | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    entry_fee: "",
    sort_order: 1,
    default_display_mode: "fastest" as ClassCatalog["default_display_mode"],
    active: true,
    rules: "",
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("class_catalog")
        .select("*")
        .order("sort_order", { ascending: true });

      if (data) {
        setClasses(data);
      }
    } catch (err: any) {
      console.error("Error loading class catalog:", err);
      setMessage({ type: "error", text: "Failed to load class catalog." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const openCreateModal = () => {
    setEditingClass(null);
    const nextSort = (classes.length > 0 ? Math.max(...classes.map((c) => c.sort_order || 0)) : 0) + 1;
    setFormData({
      name: "",
      entry_fee: "",
      sort_order: nextSort,
      default_display_mode: "fastest",
      active: true,
      rules: "",
    });
    setModalOpen(true);
    setMessage(null);
  };

  const openEditModal = (c: ClassCatalog) => {
    setEditingClass(c);
    setFormData({
      name: c.name,
      entry_fee: c.entry_fee || "",
      sort_order: c.sort_order,
      default_display_mode: c.default_display_mode,
      active: c.active,
      rules: c.rules || "",
    });
    setModalOpen(true);
    setMessage(null);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      if (editingClass) {
        // Update class
        const { error } = await supabase
          .from("class_catalog")
          .update({
            name: formData.name.trim(),
            entry_fee: formData.entry_fee.trim() || null,
            sort_order: formData.sort_order,
            default_display_mode: formData.default_display_mode,
            active: formData.active,
            rules: formData.rules.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingClass.id);

        if (error) throw error;
        setMessage({ type: "success", text: "Class updated successfully!" });
      } else {
        // Insert class
        const { error } = await supabase.from("class_catalog").insert({
          name: formData.name.trim(),
          entry_fee: formData.entry_fee.trim() || null,
          sort_order: formData.sort_order,
          default_display_mode: formData.default_display_mode,
          active: formData.active,
          rules: formData.rules.trim() || null,
        });

        if (error) throw error;
        setMessage({ type: "success", text: "New class added to catalog!" });
      }

      setModalOpen(false);
      await loadClasses();
    } catch (err: any) {
      console.error("Save class error:", err);
      setMessage({ type: "error", text: err.message || "Failed to save class." });
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status in 1 click
  const handleToggleActive = async (classItem: ClassCatalog) => {
    try {
      const newActive = !classItem.active;
      const { error } = await supabase
        .from("class_catalog")
        .update({ active: newActive })
        .eq("id", classItem.id);

      if (error) throw error;

      setClasses((prev) =>
        prev.map((c) => (c.id === classItem.id ? { ...c, active: newActive } : c))
      );
    } catch (err: any) {
      alert(`Error updating class status: ${err.message}`);
    }
  };

  // Delete class
  const handleDeleteClass = async (classId: string, name: string) => {
    if (!confirm(`Delete class "${name}" from master catalog?`)) return;

    try {
      const { error } = await supabase.from("class_catalog").delete().eq("id", classId);
      if (error) throw error;
      setClasses((prev) => prev.filter((c) => c.id !== classId));
      setMessage({ type: "success", text: "Class deleted from catalog." });
    } catch (err: any) {
      alert(`Error deleting class: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
            Master Class Catalog
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted-fg)" }}>
            Maintain the master repository of vehicle classes, technical specifications, and entry fees.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
          style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
        >
          <Plus className="w-4 h-4" /> Add Master Class
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

      {/* Classes Table */}
      {loading ? (
        <div className="py-12 text-center text-xs" style={{ color: "var(--muted-fg)" }}>
          Loading class catalog...
        </div>
      ) : classes.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--muted-fg)" }}
        >
          No classes in catalog. Click &quot;Add Master Class&quot; to create one.
        </div>
      ) : (
        <div
          className="rounded-2xl border overflow-hidden shadow-sm"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                    style={{ background: "var(--muted)", color: "var(--primary)" }}
                  >
                    #{cls.sort_order}
                  </span>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-black text-base" style={{ color: "var(--foreground)" }}>
                        {cls.name}
                      </h2>
                      {cls.entry_fee && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400">
                          {cls.entry_fee}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          cls.active ? "bg-emerald-500/10 text-emerald-600" : "bg-zinc-500/10 text-zinc-500"
                        }`}
                      >
                        {cls.active ? "Active" : "Inactive"}
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-muted-fg">
                        Scoring: {cls.default_display_mode}
                      </span>
                    </div>

                    {cls.rules && (
                      <p
                        className="text-xs mt-1.5 line-clamp-2 max-w-2xl leading-relaxed"
                        style={{ color: "var(--muted-fg)" }}
                      >
                        {cls.rules}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    onClick={() => handleToggleActive(cls)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                  >
                    {cls.active ? "Disable" : "Enable"}
                  </button>

                  <button
                    onClick={() => openEditModal(cls)}
                    className="p-2 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                    title="Edit class"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteClass(cls.id, cls.name)}
                    className="p-2 rounded-xl border text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
                    style={{ borderColor: "var(--border)" }}
                    title="Delete class"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT CLASS MODAL ────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border p-6 shadow-xl"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black" style={{ color: "var(--foreground)" }}>
                {editingClass ? "Edit Master Class" : "Add Master Class"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: "var(--muted-fg)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Renegade Cuts, Unlimited, Pure Street"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-amber-600"
                  style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                    Entry Fee
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. \$25"
                    value={formData.entry_fee}
                    onChange={(e) => setFormData({ ...formData, entry_fee: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-amber-600"
                    style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-amber-600"
                    style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                    Scoring Mode
                  </label>
                  <select
                    value={formData.default_display_mode}
                    onChange={(e) => setFormData({ ...formData, default_display_mode: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-amber-600"
                    style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  >
                    <option value="fastest">Fastest</option>
                    <option value="consistency">Consistency</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                  Technical Rules &amp; Specifications
                </label>
                <textarea
                  rows={6}
                  placeholder="Engine, Chassis, Body, and Safety regulations for this class..."
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  className="w-full p-3 rounded-xl border text-xs leading-relaxed outline-none focus:border-amber-600"
                  style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>

              <label className="flex items-center gap-2 p-3 rounded-xl border cursor-pointer" style={{ background: "var(--muted)", borderColor: "var(--border)" }}>
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded text-amber-600 w-4 h-4"
                />
                <div>
                  <div className="text-xs font-bold" style={{ color: "var(--foreground)" }}>Active Class</div>
                  <div className="text-[10px]" style={{ color: "var(--muted-fg)" }}>Active classes appear in the public catalog and race selectors</div>
                </div>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
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
                  <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : editingClass ? "Update Class" : "Save Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
