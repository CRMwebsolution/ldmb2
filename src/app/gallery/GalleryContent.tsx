"use client";

import { useEffect, useState } from "react";
import { GalleryLightbox } from "@/components/GalleryLightbox";
import { galleryClient, type GalleryImage } from "@/lib/gallery";

type Media = GalleryImage & { video: boolean };
const BUCKET = "trailer-images";
const WEBHOOK = "https://n8n.southernautomate.com/webhook/101b8651-0183-48d6-b58b-33bd7ac7d9d9";

export function GalleryContent() {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState<number[]>([]);

  useEffect(() => {
    let active = true;
    galleryClient.from("truck_photos").select("id, photo_url, description, year, uploaded_at")
      .eq("status", "approved").order("year", { ascending: false }).order("uploaded_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError("Gallery photos could not be loaded. Please try again later.");
        else setMedia((data || []).map((row) => ({
          id: String(row.id), src: row.photo_url, alt: row.description || "Little Doo Mud Bog photo",
          year: Number(row.year || new Date().getFullYear()),
          video: /\.(mp4|mov|webm|avi)$/i.test(row.photo_url.split("?")[0]),
        })));
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const years = [...new Set(media.map((item) => item.year))].sort((a, b) => b - a);
  const currentYear = new Date().getFullYear();

  function choosePhoto(files: FileList | null) {
    const candidates = Array.from(files || []);
    const images = candidates.filter((candidate) => candidate.type.startsWith("image/"));
    if (!images.length) {
      setMessage("Choose an image to submit.");
      return;
    }
    setFile(images[0]);
    setMessage(candidates.length > 1 ? "Only one photo can be submitted at a time. We kept the first image." : "");
  }

  async function uploadPhoto(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) {
      setMessage("Choose one image smaller than 15 MB.");
      return;
    }
    setUploading(true);
    setMessage("");
    const path = `LDMB/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    try {
      const { error: uploadError } = await galleryClient.storage.from(BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const publicUrl = galleryClient.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      const { error: rowError } = await galleryClient.from("truck_photos").insert({
        photo_url: publicUrl, description: caption.trim() || "User submitted photo",
        status: "pending", user_id: null, year: currentYear,
      });
      if (rowError) {
        await galleryClient.storage.from(BUCKET).remove([path]);
        throw rowError;
      }
      // The existing approval workflow receives only metadata after storage succeeds.
      fetch(WEBHOOK, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption, media_type: "image", source: "Little Doo Mud Bog Gallery",
          timestamp: new Date().toISOString(), media_url: publicUrl, status: "pending", table_name: "truck_photos" }),
      }).catch((error) => console.warn("Gallery approval notification failed", error));
      setFile(null);
      setCaption("");
      setMessage("Photo received. It will appear in the gallery after approval.");
    } catch (error) {
      console.error("Gallery upload failed", error);
      setMessage("Photo could not be uploaded. Please try again later.");
    } finally {
      setUploading(false);
    }
  }

  return <div className="space-y-8">
    {loading ? <p>Loading track photos...</p> : error ? <p role="alert">{error}</p> : years.length === 0 ? <p>No approved photos have been posted yet.</p> : years.map((year) => {
      const items = media.filter((item) => item.year === year);
      const open = year === currentYear ? !expanded.includes(year) : expanded.includes(year);
      return <section key={year} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
        <button type="button" className="w-full text-left text-xl font-black mb-4" aria-expanded={open}
          onClick={() => setExpanded((prev) => prev.includes(year) ? prev.filter((value) => value !== year) : [...prev, year])}>{year} Gallery ({items.length})</button>
        {open && <>
          <GalleryLightbox images={items.filter((item) => !item.video)} />
          {items.some((item) => item.video) && <div className="grid sm:grid-cols-2 gap-4 mt-4">{items.filter((item) => item.video)
            .map((item) => <video key={item.id} src={item.src} controls className="w-full rounded-xl" aria-label={item.alt} />)}</div>}
        </>}
      </section>;
    })}
    <form onSubmit={uploadPhoto} className="rounded-2xl border p-5 space-y-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <h2 className="font-black text-lg">Submit a Photo</h2>
      <p className="text-sm" style={{ color: "var(--muted-fg)" }}>Choose one image. Photos are reviewed before appearing here.</p>
      <div className="rounded-xl border-2 border-dashed p-5 text-center"
        style={{ borderColor: dragOver ? "var(--primary)" : "var(--border)", background: "var(--muted)" }}
        onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
        onDragLeave={(event) => { event.preventDefault(); setDragOver(false); }}
        onDrop={(event) => { event.preventDefault(); setDragOver(false); choosePhoto(event.dataTransfer.files); }}>
        <label className="block font-semibold" htmlFor="gallery-photo">Choose a photo or drag one here</label>
        <input id="gallery-photo" type="file" accept="image/*" className="mt-2 max-w-full"
          onChange={(event) => { choosePhoto(event.target.files); event.target.value = ""; }} />
        {file && <div className="mt-3 text-sm">Selected: {file.name} <button type="button" onClick={() => setFile(null)}
          className="ml-2 font-bold underline" style={{ color: "var(--primary)" }}>Remove</button></div>}
      </div>
      <input type="text" value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={300}
        placeholder="Optional caption" aria-label="Photo caption" className="block w-full rounded-lg border p-2" style={{ borderColor: "var(--border)", background: "var(--muted)" }} />
      <button type="submit" disabled={!file || uploading} className="rounded-lg px-4 py-2 font-bold disabled:opacity-50" style={{ background: "var(--primary)", color: "var(--primary-fg)" }}>
        {uploading ? "Uploading..." : "Submit Photo"}
      </button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
  </div>;
}
