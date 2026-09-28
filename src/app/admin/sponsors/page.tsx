"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { SponsorItem } from "@/lib/supabase/types";
import {
  Building,
  Plus,
  Edit2,
  Trash2,
  Save,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Phone,
} from "lucide-react";

export default function AdminSponsorsPage() {
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<SponsorItem | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    tier: "general",
    url: "",
    logo: "",
    phone: "",
    description: "",
    display_order: 0,
    active: true,
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadSponsors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sponsors")
        .select("*")
        .order("display_order", { ascending: true });

      if (data) {
        setSponsors(data);
      }
    } catch (err: any) {
      console.error("Error loading sponsors:", err);
      setMessage({ type: "error", text: "Failed to load sponsors." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSponsors();
  }, []);

  const openCreateModal = () => {
    setEditingSponsor(null);
    const nextOrder = (sponsors.length > 0 ? Math.max(...sponsors.map((s) => s.display_order || 0)) : 0) + 1;
    setFormData({
      name: "",
      tier: "general",
      url: "",
      logo: "",
      phone: "",
      description: "",
      display_order: nextOrder,
      active: true,
    });
    setModalOpen(true);
    setMessage(null);
  };

  const openEditModal = (s: SponsorItem) => {
    setEditingSponsor(s);
    setFormData({
      name: s.name,
      tier: s.tier || "general",
      url: s.url || "",
      logo: s.logo || "",
      phone: s.phone || "",
      description: s.description || "",
      display_order: s.display_order ?? 0,
      active: s.active ?? true,
    });
    setModalOpen(true);
    setMessage(null);
  };

  const handleSaveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      if (editingSponsor) {
        // Update
        const { error } = await supabase
          .from("sponsors")
          .update({
            name: formData.name.trim(),
            tier: formData.tier,
            url: formData.url.trim() || null,
            logo: formData.logo.trim() || null,
            phone: formData.phone.trim() || null,
            description: formData.description.trim() || null,
            display_order: formData.display_order,
            active: formData.active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingSponsor.id);

        if (error) throw error;
        setMessage({ type: "success", text: "Sponsor updated successfully!" });
      } else {
        // Insert
        const { error } = await supabase.from("sponsors").insert({
          name: formData.name.trim(),
          tier: formData.tier,
          url: formData.url.trim() || null,
          logo: formData.logo.trim() || null,
          phone: formData.phone.trim() || null,
          description: formData.description.trim() || null,
          display_order: formData.display_order,
          active: formData.active,
        });

        if (error) throw error;
        setMessage({ type: "success", text: "New sponsor created!" });
      }

      setModalOpen(false);
      await loadSponsors();
    } catch (err: any) {
      console.error("Save sponsor error:", err);
      setMessage({ type: "error", text: err.message || "Failed to save sponsor." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (s: SponsorItem) => {
    try {
      const newActive = !s.active;
      const { error } = await supabase
        .from("sponsors")
        .update({ active: newActive })
        .eq("id", s.id);

      if (error) throw error;

      setSponsors((prev) =>
        prev.map((item) => (item.id === s.id ? { ...item, active: newActive } : item))
      );
    } catch (err: any) {
      alert(`Error updating sponsor status: ${err.message}`);
    }
  };

  const handleDeleteSponsor = async (sponsorId: string, name: string) => {
    if (!confirm(`Delete sponsor "${name}"?`)) return;

    try {
      const { error } = await supabase.from("sponsors").delete().eq("id", sponsorId);
      if (error) throw error;
      setSponsors((prev) => prev.filter((s) => s.id !== sponsorId));
      setMessage({ type: "success", text: "Sponsor deleted." });
    } catch (err: any) {
      alert(`Error deleting sponsor: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
            Sponsors &amp; Partners
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted-fg)" }}>
            Manage official sponsor brands, logo URLs, partner tiers, and website links.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
          style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
        >
          <Plus className="w-4 h-4" /> Add Sponsor
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

      {/* Sponsors Table */}
      {loading ? (
        <div className="py-12 text-center text-xs" style={{ color: "var(--muted-fg)" }}>
          Loading sponsors...
        </div>
      ) : sponsors.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--muted-fg)" }}
        >
          No sponsors in the database yet. Click &quot;Add Sponsor&quot; to add your first partner.
        </div>
      ) : (
        <div
          className="rounded-2xl border overflow-hidden shadow-sm"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {sponsors.map((sponsor) => (
              <div
                key={sponsor.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {sponsor.logo ? (
                    <div className="w-12 h-12 rounded-xl border flex items-center justify-center p-1 overflow-hidden shrink-0" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sponsor.logo} alt={sponsor.name} className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-black shrink-0"
                      style={{ background: "var(--muted)", color: "var(--primary)" }}
                    >
                      {sponsor.name[0]}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-black text-base" style={{ color: "var(--foreground)" }}>
                        {sponsor.name}
                      </h2>
                      <span
                        className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full"
                        style={{ background: "rgba(180,83,9,0.12)", color: "var(--primary)" }}
                      >
                        {sponsor.tier || "general"}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          sponsor.active ? "bg-emerald-500/10 text-emerald-600" : "bg-zinc-500/10 text-zinc-500"
                        }`}
                      >
                        {sponsor.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs mt-1 flex-wrap" style={{ color: "var(--muted-fg)" }}>
                      {sponsor.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {sponsor.phone}
                        </span>
                      )}
                      {sponsor.url && (
                        <a
                          href={sponsor.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-600 hover:underline flex items-center gap-0.5"
                        >
                          <ExternalLink className="w-3 h-3" /> {sponsor.url}
                        </a>
                      )}
                    </div>

                    {sponsor.description && (
                      <p className="text-xs mt-1 text-muted-fg line-clamp-1">{sponsor.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    onClick={() => handleToggleActive(sponsor)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                  >
                    {sponsor.active ? "Disable" : "Enable"}
                  </button>

                  <button
                    onClick={() => openEditModal(sponsor)}
                    className="p-2 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                    title="Edit sponsor"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteSponsor(sponsor.id, sponsor.name)}
                    className="p-2 rounded-xl border text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
                    style={{ borderColor: "var(--border)" }}
                    title="Delete sponsor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT SPONSOR MODAL ──────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-lg rounded-2xl border p-6 shadow-xl"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black" style={{ color: "var(--foreground)" }}>
                {editingSponsor ? "Edit Sponsor" : "Add New Sponsor"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: "var(--muted-fg)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSponsor} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                  Sponsor / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Crystal Coast Tire & Wheel"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-amber-600"
                  style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                    Sponsorship Tier
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-amber-600"
                    style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  >
                    <option value="platinum">Platinum</option>
                    <option value="gold">Gold</option>
                    <option value="silver">Silver</option>
                    <option value="bronze">Bronze</option>
                    <option value="general">General Partner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-amber-600"
                    style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="(252) 555-0199"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-amber-600"
                    style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                    Website URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-amber-600"
                    style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                  Logo Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.logo}
                  onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-amber-600"
                  style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted-fg)" }}>
                  Short Description
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Mud, off-road, and performance parts supplier since 1998"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border text-xs outline-none focus:border-amber-600"
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
                  <div className="text-xs font-bold" style={{ color: "var(--foreground)" }}>Active Sponsor</div>
                  <div className="text-[10px]" style={{ color: "var(--muted-fg)" }}>Display on public sponsors page</div>
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
                  <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Sponsor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
