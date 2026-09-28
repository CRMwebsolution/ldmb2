"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { Calendar, MapPin, ChevronRight, Trophy, Users, Truck, ShieldCheck, Flag } from "lucide-react";
import { AnimateIn } from "@/components/AnimateIn";
import { CountdownTimer } from "@/components/CountdownTimer";
import { supabase } from "@/lib/supabase/client";
import { Race, ClassCatalog } from "@/lib/supabase/types";
import { isNextRace, raceStartIso } from "@/lib/race-schedule";

const fallbackStats = [
  { label: "Track Length", value: "200 ft", icon: "📏" },
  { label: "Active Classes", value: "—", icon: "🏎️" },
  { label: "Season", value: "Feb–Dec", icon: "🗓️" },
];

export default function HomePage() {
  const [upcomingRaces, setUpcomingRaces] = useState<Race[]>([]);
  const [activeCatalog, setActiveCatalog] = useState<ClassCatalog[]>([]);
  const [loading, setLoading] = useState(true);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    async function loadData() {
      try {
        const [racesRes, catalogRes] = await Promise.all([
          supabase
            .from("races")
            .select("*")
            .eq("show_on_schedule", true)
            .order("date", { ascending: true }),
          supabase
            .from("class_catalog")
            .select("*")
            .eq("active", true)
            .order("sort_order", { ascending: true }),
        ]);

        if (racesRes.data) {
          setUpcomingRaces(racesRes.data);
        }
        if (catalogRes.data) {
          setActiveCatalog(catalogRes.data);
        }
      } catch (err) {
        console.error("Error loading home data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const nextRace = upcomingRaces.find((race) => isNextRace(race));
  const visibleUpcoming = upcomingRaces.filter((race) => isNextRace(race));

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative h-[90vh] min-h-[600px] overflow-hidden grain-overlay"
        style={{ background: "#0C0A07" }}
      >
        {/* Background image with parallax */}
        <motion.div className="absolute inset-0" style={{ y: bgY }}>
          {/* Deep earthy gradient with texture */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 30% 60%, #3D2008 0%, #1A0F00 50%, #0C0A07 100%)",
            }}
          />
          {/* Subtle tire track / mud texture pattern */}
          <svg
            className="absolute inset-0 w-full h-full opacity-5"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <pattern id="tracks" x="0" y="0" width="40" height="60" patternUnits="userSpaceOnUse">
                <rect x="8" y="0" width="6" height="60" fill="#B45309" rx="1" />
                <rect x="26" y="0" width="6" height="60" fill="#B45309" rx="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tracks)" />
          </svg>
        </motion.div>

        {/* Animated mud particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full opacity-30"
              style={{
                background: `hsl(${25 + i * 5}, 60%, ${25 + i * 4}%)`,
                left: `${10 + i * 12}%`,
                top: `${-5 + (i % 3) * 5}%`,
                animationName: "mudDrop",
                animationDuration: `${3 + i * 0.7}s`,
                animationDelay: `${i * 0.4}s`,
                animationTimingFunction: "linear",
                animationIterationCount: "infinite",
                animationFillMode: "both",
              }}
            />
          ))}
        </div>

        {/* Hero content */}
        <motion.div
          className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4"
          style={{ y: textY, opacity }}
        >
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xs font-bold uppercase tracking-[0.25em] mb-4 flex items-center gap-2"
            style={{ color: "#D97706" }}
          >
            <MapPin className="w-3.5 h-3.5" /> Newport, North Carolina
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter text-white leading-none mb-4"
          >
            LITTLE DOO
            <br />
            <span style={{ color: "#D97706" }}>MUD BOG</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-base sm:text-lg max-w-xl mx-auto mb-8"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Family owned mud racing in Newport, North Carolina. Come see trucks and custom machines take on the 200-foot track.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <Link
              href="/events"
              className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-100 flex items-center gap-2"
              style={{ background: "#D97706", color: "#000" }}
            >
              <Calendar className="w-4 h-4" /> View Schedule
            </Link>
            <Link
              href="/race-results"
              className="px-6 py-3 rounded-xl font-bold text-sm border transition-all hover:scale-105 active:scale-100 flex items-center gap-2"
              style={{
                borderColor: "rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              <Trophy className="w-4 h-4" /> Race Results
            </Link>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <div
              className="w-6 h-10 rounded-full border-2 flex items-start justify-center pt-2"
              style={{ borderColor: "rgba(255,255,255,0.3)" }}
            >
              <div
                className="w-1 h-3 rounded-full"
                style={{ background: "#D97706" }}
              />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Countdown to Next Race ────────────────────────────────────────── */}
      {nextRace && (
        <section className="py-12 px-4 border-b" style={{ background: "var(--muted)", borderColor: "var(--border)" }}>
          <div className="max-w-2xl mx-auto">
            <AnimateIn>
              <div className="text-center mb-6">
                <span
                  className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-flex items-center gap-1.5"
                  style={{ background: "rgba(180,83,9,0.15)", color: "var(--primary)" }}
                >
                  <Flag className="w-3.5 h-3.5" /> Next Race Event
                </span>
                <h2
                  className="text-2xl sm:text-3xl font-black tracking-tight mt-2"
                  style={{ color: "var(--foreground)" }}
                >
                  {nextRace.name} Race Night
                  {nextRace.special_label && (
                    <span className="block sm:inline text-sm font-semibold ml-2 text-amber-600 dark:text-amber-400">
                      ({nextRace.special_label})
                    </span>
                  )}
                </h2>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--muted-fg)" }}
                >
                  {new Date(nextRace.date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  · Gates open 2:00 PM · Racing 4:00 PM
                </p>
              </div>
              <CountdownTimer
              targetDate={raceStartIso(nextRace.date)}
                eventName={`${nextRace.name} Race`}
              />
              <div className="mt-4 text-center">
                <Link
                  href="/events"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                  style={{ color: "var(--primary)" }}
                >
                  View full race schedule <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </AnimateIn>
          </div>
        </section>
      )}

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {fallbackStats.map((stat, i) => (
              <AnimateIn key={stat.label} delay={i * 0.08}>
                <div
                  className="rounded-2xl p-6 text-center border transition-all hover:border-amber-600/50"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div
                    className="text-2xl sm:text-3xl font-black"
                    style={{ color: "var(--primary)" }}
                  >
                    {stat.label === "Active Classes" && activeCatalog.length > 0
                      ? activeCatalog.length
                      : stat.value}
                  </div>
                  <div
                    className="text-xs font-semibold uppercase tracking-widest mt-1"
                    style={{ color: "var(--muted-fg)" }}
                  >
                    {stat.label}
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── About teaser ───────────────────────────────────────────────────── */}
      <section className="py-16 px-4" style={{ background: "var(--muted)" }}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <AnimateIn direction="left">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--primary)" }}
            >
              The Experience
            </span>
            <h2
              className="text-3xl sm:text-4xl font-black tracking-tight mt-2 mb-4"
              style={{ color: "var(--foreground)" }}
            >
              200 feet of adrenaline &amp; mud.
            </h2>
            <p style={{ color: "var(--muted-fg)" }} className="leading-relaxed mb-4">
              Located at 759 Tom Mann Rd in Newport, NC, Little Doo Mud Bog is
              a family-owned venue built for grassroots racers and off-road families.
              The 200-foot mud track has welcomed racers and families for generations.
            </p>
            <p style={{ color: "var(--muted-fg)" }} className="leading-relaxed mb-6">
              Spectators are welcome to bring tailgate chairs and cookout grills.
              Kids 12 &amp; under get in free with a paid adult.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/track"
                className="inline-flex items-center gap-2 text-sm font-semibold"
                style={{ color: "var(--primary)" }}
              >
                Track specs &amp; directions <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </AnimateIn>

          <AnimateIn direction="right">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Calendar className="w-5 h-5" />, title: "Monthly Races", desc: "Feb through Dec schedule" },
                { icon: <MapPin className="w-5 h-5" />, title: "Newport, NC", desc: "759 Tom Mann Rd" },
                { icon: <Users className="w-5 h-5" />, title: "Family Friendly", desc: "Kids 12 & under free" },
                { icon: <ShieldCheck className="w-5 h-5" />, title: "Live Tech & Rules", desc: "Inspected class brackets" },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-xl p-4 border"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <div style={{ color: "var(--primary)" }} className="mb-2">
                    {card.icon}
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {card.title}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: "var(--muted-fg)" }}
                  >
                    {card.desc}
                  </div>
                </div>
              ))}
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ── Upcoming Races from Supabase ─────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <AnimateIn>
            <div className="flex items-end justify-between mb-8">
              <div>
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: "var(--primary)" }}
                >
                  Live Race Calendar
                </span>
                <h2
                  className="text-3xl font-black tracking-tight mt-1"
                  style={{ color: "var(--foreground)" }}
                >
                  Upcoming Race Nights
                </h2>
              </div>
              <Link
                href="/events"
                className="text-sm font-semibold flex items-center gap-1"
                style={{ color: "var(--primary)" }}
              >
                All schedule <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </AnimateIn>

          <div className="grid sm:grid-cols-3 gap-4">
            {visibleUpcoming.slice(0, 3).map((race, i) => {
              const d = new Date(race.date + "T00:00:00");
              return (
                <AnimateIn key={race.id} delay={i * 0.1}>
                  <div
                    className="rounded-2xl border p-5 flex flex-col h-full"
                    style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-start gap-4 mb-3">
                      <div
                        className="rounded-xl p-3 text-center min-w-[56px]"
                        style={{ background: "var(--muted)" }}
                      >
                        <div
                          className="text-xs font-bold uppercase"
                          style={{ color: "var(--primary)" }}
                        >
                          {d.toLocaleDateString("en-US", { month: "short" })}
                        </div>
                        <div
                          className="text-2xl font-black leading-none"
                          style={{ color: "var(--foreground)" }}
                        >
                          {d.getDate()}
                        </div>
                      </div>
                      <div>
                        <h3
                          className="font-bold text-base"
                          style={{ color: "var(--foreground)" }}
                        >
                          {race.name} Race
                        </h3>
                        {race.special_label && (
                          <span className="inline-block text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            {race.special_label}
                          </span>
                        )}
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--muted-fg)" }}
                        >
                          Gates 2:00 PM · Racing 4:00 PM
                        </p>
                      </div>
                    </div>
                    <p
                      className="text-sm leading-relaxed flex-1"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      Status:{" "}
                      <span className="font-semibold capitalize" style={{ color: "var(--foreground)" }}>
                        {race.event_status}
                      </span>
                      . Bring your truck, jeep, or buggy to compete or cheer from the fence.
                    </p>
                    <Link
                      href="/events"
                      className="mt-4 text-xs font-semibold flex items-center gap-1"
                      style={{ color: "var(--primary)" }}
                    >
                      Event Details <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </AnimateIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────────────────── */}
      <section
        className="py-20 px-4 text-center"
        style={{ background: "var(--primary)" }}
      >
        <AnimateIn>
          <Trophy className="w-10 h-10 mx-auto mb-4" style={{ color: "rgba(255,255,255,0.5)" }} />
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-3">
            Want to put your vehicle in the pit?
          </h2>
          <p
            className="text-sm sm:text-base max-w-md mx-auto mb-6"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            Check class rules and entry fees, or contact our track officials for class placement.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/classes"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-white transition-all hover:scale-105"
              style={{ color: "var(--primary)" }}
            >
              <Truck className="w-4 h-4" /> View Class Rules
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border border-white/40 text-white transition-all hover:bg-white/10"
            >
              Contact Track
            </Link>
          </div>
        </AnimateIn>
      </section>
    </div>
  );
}
