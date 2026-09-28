"use client";

import { useEffect, useState } from "react";
import { AnimateIn } from "@/components/AnimateIn";
import { supabase } from "@/lib/supabase/client";
import { SponsorItem } from "@/lib/supabase/types";
import { ExternalLink, Phone, Award, Sparkles, Building } from "lucide-react";

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSponsors() {
      try {
        const { data, error } = await supabase
          .from("sponsors")
          .select("*")
          .eq("active", true)
          .order("display_order", { ascending: true });

        if (data) {
          setSponsors(data);
        }
      } catch (err) {
        console.error("Error loading sponsors:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSponsors();
  }, []);

  const tiers = [
    { key: "platinum", title: "Platinum Champions", desc: "Premier partners driving the season forward." },
    { key: "gold", title: "Gold Tier Partners", desc: "Proud supporters of the Little Doo motorsport community." },
    { key: "silver", title: "Silver Sponsors", desc: "Local businesses dedicated to grassroots racing." },
    { key: "bronze", title: "Bronze Supporters", desc: "Community contributors keeping the mud flying." },
    { key: "general", title: "Track Partners", desc: "Valued supporters of Little Doo Mud Bog." },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <AnimateIn>
        <div className="mb-12">
          <span
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block"
            style={{ background: "rgba(180,83,9,0.12)", color: "var(--primary)" }}
          >
            Our Community Partners
          </span>
          <h1
            className="text-4xl sm:text-5xl font-black tracking-tight mt-2"
            style={{ color: "var(--foreground)" }}
          >
            Track Sponsors &amp; Partners
          </h1>
          <p className="mt-2 max-w-2xl" style={{ color: "var(--muted-fg)" }}>
            Little Doo Mud Bog is made possible by the dedicated support of local businesses, performance shops, and off-road enthusiasts across North Carolina.
          </p>
        </div>
      </AnimateIn>

      {loading ? (
        <div className="py-12 text-center" style={{ color: "var(--muted-fg)" }}>
          Loading official sponsors...
        </div>
      ) : sponsors.length === 0 ? (
        <AnimateIn delay={0.1}>
          <div
            className="rounded-2xl border p-8 sm:p-12 text-center mb-12"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Award className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
              Sponsorship Program 2026
            </h2>
            <p className="text-sm max-w-lg mx-auto mt-2 leading-relaxed" style={{ color: "var(--muted-fg)" }}>
              Put your brand in front of thousands of passionate motorsports fans every month. We offer banner space, PA announcements, social media promotion, and VIP track access.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href="tel:+12523420865"
                className="px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2"
                style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
              >
                <Phone className="w-4 h-4" /> Call (252) 342-0865
              </a>
              <a
                href="/contact"
                className="px-6 py-3 rounded-xl text-sm font-bold border"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                Inquire Online
              </a>
            </div>
          </div>
        </AnimateIn>
      ) : (
        tiers.map((t) => {
          const tierSponsors = sponsors.filter((s) => (s.tier || "general").toLowerCase() === t.key);
          if (tierSponsors.length === 0) return null;

          return (
            <section key={t.key} className="mb-12">
              <AnimateIn>
                <div className="mb-4">
                  <h2
                    className="text-xl font-black tracking-tight capitalize"
                    style={{ color: "var(--foreground)" }}
                  >
                    {t.title}
                  </h2>
                  <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
                    {t.desc}
                  </p>
                </div>
              </AnimateIn>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {tierSponsors.map((sponsor) => (
                  <div
                    key={sponsor.id}
                    className="rounded-2xl border p-5 flex flex-col justify-between"
                    style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                  >
                    <div>
                      {sponsor.logo && (
                        <div className="h-16 mb-4 flex items-center justify-start">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sponsor.logo}
                            alt={sponsor.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      )}
                      <h3 className="font-bold text-base" style={{ color: "var(--foreground)" }}>
                        {sponsor.name}
                      </h3>
                      {sponsor.description && (
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--muted-fg)" }}>
                          {sponsor.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: "var(--border)" }}>
                      {sponsor.phone && (
                        <a
                          href={`tel:${sponsor.phone}`}
                          className="text-xs flex items-center gap-1 font-semibold"
                          style={{ color: "var(--muted-fg)" }}
                        >
                          <Phone className="w-3 h-3" /> {sponsor.phone}
                        </a>
                      )}
                      {sponsor.url && (
                        <a
                          href={sponsor.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold flex items-center gap-1 ml-auto"
                          style={{ color: "var(--primary)" }}
                        >
                          Visit <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}

      {/* Become a Sponsor CTA */}
      <AnimateIn delay={0.2}>
        <div
          className="mt-12 rounded-2xl border p-8 text-center"
          style={{ background: "var(--muted)", borderColor: "var(--border)" }}
        >
          <h2 className="text-2xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
            Become a Little Doo Sponsor
          </h2>
          <p className="text-sm mt-2 max-w-md mx-auto leading-relaxed" style={{ color: "var(--muted-fg)" }}>
            Connect with off-road competitors and loyal motorsports families throughout the season. Packages include pit signage, event announcements, and digital visibility.
          </p>
          <div className="mt-6">
            <a
              href="tel:+12523420865"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
            >
              <Phone className="w-4 h-4" /> (252) 342-0865
            </a>
          </div>
        </div>
      </AnimateIn>
    </div>
  );
}
