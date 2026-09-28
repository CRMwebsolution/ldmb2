"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/classes", label: "Classes" },
  { href: "/track", label: "Track" },
  { href: "/gallery", label: "Gallery" },
  { href: "/leaderboard", label: "Results" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <span
                className="text-xl font-black tracking-tighter"
                style={{ color: "var(--primary)" }}
              >
                LITTLE DOO
              </span>
              <span
                className="text-xs font-semibold uppercase tracking-widest hidden sm:block"
                style={{ color: "var(--muted-fg)" }}
              >
                Mud Bog
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {links.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                    style={{
                      color: isActive ? "var(--primary)" : "var(--muted-fg)",
                    }}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-md"
                        style={{ background: "var(--muted)" }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative">{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                href="/events"
                className="hidden md:inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-fg)",
                }}
              >
                Buy Tickets
              </Link>
              {/* Mobile menu button */}
              <button
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-full"
                style={{ background: "var(--muted)", color: "var(--muted-fg)" }}
                onClick={() => setOpen(!open)}
                aria-label="Toggle menu"
              >
                {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-0 right-0 z-40 md:hidden border-b"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
              {links.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="px-3 py-2.5 rounded-md text-sm font-medium transition-colors"
                    style={{
                      background: isActive ? "var(--muted)" : "transparent",
                      color: isActive ? "var(--primary)" : "var(--foreground)",
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <Link
                href="/events"
                onClick={() => setOpen(false)}
                className="mt-2 px-3 py-2.5 rounded-md text-sm font-semibold text-center"
                style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
              >
                Buy Tickets
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
