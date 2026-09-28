import { createClient } from "@supabase/supabase-js";

// This public project URL and anon key are the same ones shipped by the original LDMB site.
// Environment variables can override them if the key is rotated.
const url = process.env.NEXT_PUBLIC_GALLERY_SUPABASE_URL || "https://fhyzsisluszpfhlngiyb.supabase.co";
const key = process.env.NEXT_PUBLIC_GALLERY_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoeXpzaXNsdXN6cGZobG5naXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwNjMxMzcsImV4cCI6MjA1MDYzOTEzN30.4Kqr4Y1c2Gc9laXE_B05AjEmVP-ozI5eOiNnXPBvnsE";

// The gallery belongs to the original site project; race results use a separate project.
export const galleryClient = createClient(url, key);

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  year: number;
  event?: string;
}
