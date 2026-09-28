import Link from "next/link";
import { MapPin, Phone, ExternalLink, Clock, Lock } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="border-t mt-auto"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <span
              className="text-2xl font-black tracking-tighter block mb-2"
              style={{ color: "var(--primary)" }}
            >
              LITTLE DOO
            </span>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--muted-fg)" }}
            >
              Family-friendly mud racing in the heart of coastal North Carolina.
              Gates open at 2 PM, racing starts at 4 PM — come make memories.
            </p>
            <a
              href="https://www.facebook.com/share/g/1BGLGx5bLA/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-sm font-medium transition-colors"
              style={{ color: "var(--primary)" }}
            >
              <ExternalLink className="w-4 h-4" />
              Follow on Facebook
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h3
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: "var(--muted-fg)" }}
            >
              Quick Links
            </h3>
            <ul className="space-y-2">
              {[
                ["Events & Schedule", "/events"],
                ["Vehicle Classes & Rules", "/classes"],
                ["Track Info", "/track"],
                ["Photo Gallery", "/gallery"],
                ["Race Results", "/race-results"],
                ["Track Sponsors", "/sponsors"],
                ["Contact & Directions", "/contact"],
                ["Admin Portal", "/admin"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm transition-colors hover:text-primary"
                    style={{ color: "var(--muted-fg)" }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: "var(--muted-fg)" }}
            >
              Find Us
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin
                  className="w-4 h-4 mt-0.5 shrink-0"
                  style={{ color: "var(--primary)" }}
                />
                <span className="text-sm" style={{ color: "var(--muted-fg)" }}>
                  759 Tom Mann Rd
                  <br />
                  Newport, NC 28570
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone
                  className="w-4 h-4 shrink-0"
                  style={{ color: "var(--primary)" }}
                />
                <a
                  href="tel:+12523420865"
                  className="text-sm"
                  style={{ color: "var(--muted-fg)" }}
                >
                  (252) 342-0865
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock
                  className="w-4 h-4 mt-0.5 shrink-0"
                  style={{ color: "var(--primary)" }}
                />
                <span className="text-sm" style={{ color: "var(--muted-fg)" }}>
                  Gates: 2:00 PM
                  <br />
                  Racing: 4:00 PM
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="text-xs" style={{ color: "var(--muted-fg)" }}>
            &copy; {currentYear} Little Doo Mud Bog · Newport, NC · All rights
            reserved.
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--muted-fg)" }}>
            <span>Feb – Dec · Monthly Events</span>
            <span>·</span>
            <Link href="/admin" className="flex items-center gap-1 hover:text-primary transition-colors">
              <Lock className="w-3 h-3" /> Official Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
