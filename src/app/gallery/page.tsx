import type { Metadata } from "next";
import { AnimateIn } from "@/components/AnimateIn";
import { GalleryContent } from "./GalleryContent";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Browse photos from Little Doo Mud Bog events — trucks, jeeps, and unlimited machines tearing through the pit.",
};

export default function GalleryPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <AnimateIn>
        <div className="mb-10">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--primary)" }}
          >
            Photo Gallery
          </span>
          <h1
            className="text-4xl sm:text-5xl font-black tracking-tight mt-1"
            style={{ color: "var(--foreground)" }}
          >
            Gallery
          </h1>
          <p className="mt-2" style={{ color: "var(--muted-fg)" }}>Photos and videos from the track, shared with approval.</p>
        </div>
      </AnimateIn>

      <AnimateIn delay={0.1}>
        <GalleryContent />
      </AnimateIn>

      {/* CTA */}
      <AnimateIn delay={0.2}>
        <div
          className="mt-10 rounded-2xl border p-6 text-center"
          style={{ background: "var(--muted)", borderColor: "var(--border)" }}
        >
          <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>
            Have photos to share?
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--muted-fg)" }}>
            Share it with us on Facebook. The upload form appears when the gallery is connected.
          </p>
          <a
            href="https://www.facebook.com/share/g/1BGLGx5bLA/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 px-5 py-2.5 text-xs font-bold rounded-lg"
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            Share on Facebook
          </a>
        </div>
      </AnimateIn>
    </div>
  );
}
