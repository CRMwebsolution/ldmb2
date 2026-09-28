import type { Metadata } from "next";
import { MapPin, Ruler, Phone, Clock, Utensils, ShowerHead } from "lucide-react";
import { AnimateIn } from "@/components/AnimateIn";

export const metadata: Metadata = {
  title: "Track Info",
  description:
    "Learn about the 200-foot Little Doo Mud Bog track and plan your visit to Newport, NC.",
};

const specs = [
  { icon: <Ruler className="w-5 h-5" />, label: "Pit Length", value: "200 feet" },
  { icon: <Clock className="w-5 h-5" />, label: "Gates Open", value: "2:00 PM" },
  { icon: <Clock className="w-5 h-5" />, label: "Racing Starts", value: "4:00 PM" },
  { icon: <MapPin className="w-5 h-5" />, label: "Location", value: "Newport, NC" },
];

const amenities = [
  { icon: <Utensils className="w-4 h-4" />, label: "Concession Stand", desc: "Hot food and drinks available all day" },
  { icon: <MapPin className="w-4 h-4" />, label: "Spectator Viewing", desc: "Plenty of room to bring chairs and grills" },
  { icon: <Phone className="w-4 h-4" />, label: "On-Site Staff", desc: "Friendly staff ready to help all day" },
];

export default function TrackPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <AnimateIn>
        <div className="mb-10">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--primary)" }}
          >
            The Venue
          </span>
          <h1
            className="text-4xl sm:text-5xl font-black tracking-tight mt-1"
            style={{ color: "var(--foreground)" }}
          >
            Track Info
          </h1>
          <p className="mt-2 max-w-2xl" style={{ color: "var(--muted-fg)" }}>
            Everything you need to know about the Little Doo Mud Bog facility
            before you arrive.
          </p>
        </div>
      </AnimateIn>

      {/* Track specs */}
      <AnimateIn>
        <section className="mb-12">
          <h2
            className="text-xl font-black tracking-tight mb-5"
            style={{ color: "var(--foreground)" }}
          >
            Track Specifications
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {specs.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border p-5"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div style={{ color: "var(--primary)" }} className="mb-2">
                  {s.icon}
                </div>
                <div
                  className="text-xl font-black"
                  style={{ color: "var(--foreground)" }}
                >
                  {s.value}
                </div>
                <div
                  className="text-xs font-semibold uppercase tracking-widest mt-1"
                  style={{ color: "var(--muted-fg)" }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>
      </AnimateIn>

      {/* About section */}
      <AnimateIn delay={0.1}>
        <section
          className="mb-12 rounded-2xl border p-8"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <h2
            className="text-xl font-black tracking-tight mb-4"
            style={{ color: "var(--foreground)" }}
          >
            About Little Doo Mud Bog
          </h2>
          <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--muted-fg)" }}>
            <p>
              Little Doo Mud Bog is a family-owned and operated mud racing
              venue nestled in coastal Newport, North Carolina. We&apos;ve been
              hosting racing events since the early days, building a tight-knit
              community of mud enthusiasts up and down the East Coast.
            </p>
            <p>
              The 200-foot mud track welcomes trucks, SUVs, and custom
              machines. Whether you&apos;re running a stock
              truck or piloting a fully custom tube chassis build, there&apos;s
              a class for you here.
            </p>
            <p>
              We hold events monthly from February through December, and we
              always welcome families. Bring the grill, bring the kids, and
              expect a day full of noise, mud, and memories.
            </p>
          </div>
        </section>
      </AnimateIn>

      {/* Amenities */}
      <AnimateIn delay={0.15}>
        <section className="mb-12">
          <h2
            className="text-xl font-black tracking-tight mb-5"
            style={{ color: "var(--foreground)" }}
          >
            Amenities
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {amenities.map((a) => (
              <div
                key={a.label}
                className="rounded-xl border p-5 flex items-start gap-4"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(180,83,9,0.1)", color: "var(--primary)" }}
                >
                  {a.icon}
                </div>
                <div>
                  <p
                    className="font-bold text-sm"
                    style={{ color: "var(--foreground)" }}
                  >
                    {a.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-fg)" }}>
                    {a.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </AnimateIn>

      {/* Map + address */}
      <AnimateIn delay={0.2}>
        <section>
          <h2
            className="text-xl font-black tracking-tight mb-5"
            style={{ color: "var(--foreground)" }}
          >
            Location
          </h2>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              style={{ background: "var(--surface)" }}
            >
              <div className="flex items-start gap-3">
                <MapPin
                  className="w-5 h-5 shrink-0 mt-0.5"
                  style={{ color: "var(--primary)" }}
                />
                <div>
                  <p
                    className="font-bold text-sm"
                    style={{ color: "var(--foreground)" }}
                  >
                    Across from 759 Tom Mann Rd, Newport, NC 28570
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-fg)" }}>
                    <a href="tel:+12523420865" className="hover:underline">
                      (252) 342-0865
                    </a>
                  </p>
                </div>
              </div>
              <a
                href="https://maps.google.com/?q=759+Tom+Mann+Rd+Newport+NC"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-4 py-2 text-xs font-bold rounded-lg"
                style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
              >
                Get Directions
              </a>
            </div>
            {/* Embedded map */}
            <div className="w-full h-72 sm:h-96">
              <iframe
                title="Little Doo Mud Bog Location"
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU3s_o&q=759+Tom+Mann+Rd+Newport+NC+28570"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      </AnimateIn>
    </div>
  );
}
