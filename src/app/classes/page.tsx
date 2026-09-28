"use client";

import { useEffect, useState } from "react";
import { AnimateIn } from "@/components/AnimateIn";
import { supabase } from "@/lib/supabase/client";
import { ClassCatalog } from "@/lib/supabase/types";
import { Search, DollarSign, FileText, ChevronDown, ChevronUp, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const { data, error } = await supabase
          .from("class_catalog")
          .select("*")
          .eq("active", true)
          .order("sort_order", { ascending: true });

        if (data) {
          setClasses(data);
          // auto expand first class with rules
          const firstWithRules = data.find((c) => c.rules && c.rules.trim().length > 0);
          if (firstWithRules) {
            setExpandedClass(firstWithRules.id);
          }
        }
      } catch (err) {
        console.error("Error loading class catalog:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const filtered = classes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.rules && c.rules.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleExpand = (id: string) => {
    setExpandedClass(expandedClass === id ? null : id);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <AnimateIn>
        <div className="mb-10">
          <span
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block"
            style={{ background: "rgba(180,83,9,0.12)", color: "var(--primary)" }}
          >
            Official Rulebook
          </span>
          <h1
            className="text-4xl sm:text-5xl font-black tracking-tight mt-2"
            style={{ color: "var(--foreground)" }}
          >
            Vehicle Classes &amp; Rules
          </h1>
          <p className="mt-2 max-w-2xl" style={{ color: "var(--muted-fg)" }}>
            Explore official competition classes, vehicle technical requirements, safety rules, and entry fees.
          </p>
        </div>
      </AnimateIn>

      {/* Search and stats bar */}
      <AnimateIn delay={0.1}>
        <div
          className="rounded-2xl border p-4 mb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--muted-fg)" }}
            />
            <input
              type="text"
              placeholder="Search classes, tire sizes, engine rules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border outline-none transition-colors focus:border-amber-600"
              style={{
                background: "var(--muted)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--muted-fg)" }}>
            <span>{classes.length} Official Classes</span>
          </div>
        </div>
      </AnimateIn>

      {/* Classes list */}
      {loading ? (
        <div className="py-12 text-center" style={{ color: "var(--muted-fg)" }}>
          Loading class catalog and official rules...
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl border p-10 text-center"
          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--muted-fg)" }}
        >
          No classes match &quot;{search}&quot;. Try a different search term.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item, idx) => {
            const isExpanded = expandedClass === item.id;
            return (
              <AnimateIn key={item.id} delay={idx * 0.04}>
                <div
                  className="rounded-2xl border transition-all overflow-hidden"
                  style={{
                    background: "var(--surface)",
                    borderColor: isExpanded ? "var(--primary)" : "var(--border)",
                  }}
                >
                  {/* Header click to toggle */}
                  <div
                    onClick={() => toggleExpand(item.id)}
                    className="p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                        style={{ background: "var(--muted)", color: "var(--primary)" }}
                      >
                        #{item.sort_order}
                      </span>
                      <div>
                        <h2
                          className="text-lg sm:text-xl font-black tracking-tight"
                          style={{ color: "var(--foreground)" }}
                        >
                          {item.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {item.entry_fee && (
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5"
                              style={{ background: "rgba(180,83,9,0.12)", color: "var(--primary)" }}
                            >
                              <DollarSign className="w-3 h-3" /> Entry Fee: {item.entry_fee}
                            </span>
                          )}
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded-md capitalize"
                            style={{ background: "var(--muted)", color: "var(--muted-fg)" }}
                          >
                            Scoring: {item.default_display_mode}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "var(--muted)", color: "var(--muted-fg)" }}
                      aria-label="Toggle rule details"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Expanded rule text */}
                  {isExpanded && (
                    <div
                      className="border-t p-5 sm:p-6 text-sm leading-relaxed"
                      style={{
                        borderColor: "var(--border)",
                        background: "var(--muted)",
                      }}
                    >
                      {item.rules && item.rules.trim().length > 0 ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            <FileText className="w-4 h-4" /> Technical &amp; Safety Requirements
                          </div>
                          <div
                            className="whitespace-pre-wrap font-sans text-xs sm:text-sm p-4 rounded-xl border bg-surface leading-loose"
                            style={{
                              borderColor: "var(--border)",
                              color: "var(--foreground)",
                            }}
                          >
                            {item.rules}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs italic" style={{ color: "var(--muted-fg)" }}>
                          Standard track rules apply for this class. Consult track officials at the tech gate for details.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </AnimateIn>
            );
          })}
        </div>
      )}

      {/* General Rules & Safety Reminder */}
      <AnimateIn delay={0.2}>
        <div
          className="mt-12 rounded-2xl border p-6 sm:p-8"
          style={{ background: "var(--muted)", borderColor: "var(--border)" }}
        >
          <div className="flex items-start gap-4">
            <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="font-black text-base" style={{ color: "var(--foreground)" }}>
                General Track Safety &amp; Tech Policy
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed mt-1" style={{ color: "var(--muted-fg)" }}>
                Vehicles are inspected before racing. Review the posted class rules and ask track officials about safety requirements and class placement before entering.
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold" style={{ color: "var(--primary)" }}>
              </div>
            </div>
          </div>
        </div>
      </AnimateIn>
    </div>
  );
}
