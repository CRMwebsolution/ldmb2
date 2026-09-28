import Link from "next/link";

const tabs = [
  { href: "/race-results", label: "Race archive", key: "archive" },
  { href: "/race-results/records", label: "Class records", key: "records" },
] as const;

export function ResultsTabs({ active }: { active: "archive" | "records" }) {
  return (
    <div className="mb-9">
      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--primary)" }}>Track history</span>
      <h1 className="text-4xl sm:text-5xl font-black mt-2">Race Results</h1>
      <p className="mt-2" style={{ color: "var(--muted-fg)" }}>Browse results by race or explore class records.</p>
      <nav aria-label="Results sections" className="flex gap-2 mt-7 border-b" style={{ borderColor: "var(--border)" }}>
        {tabs.map((tab) => (
          <Link key={tab.key} href={tab.href} aria-current={active === tab.key ? "page" : undefined}
            className="px-4 py-3 text-sm font-bold border-b-2 -mb-px transition-colors"
            style={{ borderColor: active === tab.key ? "var(--primary)" : "transparent", color: active === tab.key ? "var(--primary)" : "var(--muted-fg)" }}>
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
