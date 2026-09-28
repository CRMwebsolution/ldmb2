"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { RuleItem } from "@/lib/supabase/types";
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  AlertCircle,
  DollarSign,
} from "lucide-react";

export default function AdminRulesPage() {
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleItem | null>(null);

  const [formData, setFormData] = useState({
    class: "",
    entry_fee: "",
    sort_order: 1,
    rules: "",
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("rules")
        .select("*")
        .order("sort_order", { ascending: true });

      if (data) {
        setRules(data);
      }
    } catch (err: any) {
      console.error("Error loading rules:", err);
      setMessage({ type: "error", text: "Failed to load rules." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const openCreateModal = () => {
    setEditingRule(null);
    const nextSort = (rules.length > 0 ? Math.max(...rules.map((r) => r.sort_order || 0)) : 0) + 1;
    setFormData({
      class: "",
      entry_fee: "",
      sort_order: nextSort,
      rules: "",
    });
    setModalOpen(true);
    setMessage(null);
  };

  const openEditModal = (r: RuleItem) => {
    setEditingRule(r);
    setFormData({
      class: r.class || "",
      entry_fee: r.entry_fee || "",
      sort_order: r.sort_order || 1,
      rules: r.rules || "",
    });
    setModalOpen(true);
    setMessage(null);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      if (editingRule) {
        // Update
        const { error } = await supabase
          .from("rules")
          .update({
            class: formData.class.trim() || null,
            entry_fee: formData.entry_fee.trim() || null,
            sort_order: formData.sort_order,
            rules: formData.rules.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingRule.id);

        if (error) throw error;
        setMessage({ type: "success", text: "Rules updated successfully!" });
      } else {
        // Insert
        const { error } = await supabase.from("rules").insert({
          class: formData.class.trim() || null,
          entry_fee: formData.entry_fee.trim() || null,
          sort_order: formData.sort_order,
          rules: formData.rules.trim() || null,
        });

        if (error) throw error;
        setMessage({ type: "success", text: "New rule entry created!" });
      }

      setModalOpen(false);
      await loadRules();
    } catch (err: any) {
      console.error("Save rule error:", err);
      setMessage({ type: "error", text: err.message || "Failed to save rule." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: number, className: string | null) => {
    if (!confirm(`Delete rules for "${className || "Entry"}"?`)) return;

    try {
      const { error } = await supabase.from("rules").delete().eq("id", ruleId);
      if (error) throw error;
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      setMessage({ type: "success", text: "Rule entry deleted." });
    } catch (err: any) {
      alert(`Error deleting rule: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
            Class Rules Table
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted-fg)" }}>
            Edit class rules, entry fees, and technical specifications stored in the rules table.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
          style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
        >
          <Plus className="w-4 h-4" /> Add Rule Entry
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

      {/* Rules list */}
      {loading ? (
        <div className="py-12 text-center text-xs" style={{ color: "var(--muted-fg)" }}>
          Loading rules table...
        </div>
      ) : rules.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--muted-fg)" }}
        >
          No rules entries found. Click &quot;Add Rule Entry&quot; to create one.
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="rounded-2xl border p-5 shadow-xs"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                    style={{ background: "var(--muted)", color: "var(--primary)" }}
                  >
                    #{rule.sort_order ?? 0}
                  </span>
                  <div>
                    <h2 className="font-black text-base" style={{ color: "var(--foreground)" }}>
                      {rule.class || "General Rules"}
                    </h2>
                    {rule.entry_fee && (
                      <span className="text-xs font-bold text-amber-600">
                        Fee: {rule.entry_fee}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(rule)}
                    className="p-2 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                    title="Edit rules"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id, rule.class)}
                    className="p-2 rounded-xl border text-red-600 hover:bg-red-500/10 cursor-pointer"
                    style={{ borderColor: "var(--border)" }}
                    title="Delete rules"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {rule.rules && (
                <div
                  className="p-4 rounded-xl border text-xs whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-mono"
                  style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  {rule.rules}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border p-6 shadow-xl"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black" style={{ color: "var(--foreground)" }}>
                {editingRule ? "Edit Rule Entry" : "Add Rule Entry"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: "var(--muted-fg)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                  Class Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pure Street, 4 & 6 Cylinder, Running Order"
                  value={formData.class}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-amber-600"
                  style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                    Entry Fee
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. \$20"
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
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                  Rules Text
                </label>
                <textarea
                  rows={8}
                  placeholder="Paste or write detailed rules for this class..."
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  className="w-full p-3 rounded-xl border text-xs leading-relaxed outline-none focus:border-amber-600"
                  style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>

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
                  <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Rule Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
