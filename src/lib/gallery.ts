import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_GALLERY_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_GALLERY_SUPABASE_ANON_KEY;

// The gallery belongs to the original site project; race results use a separate project.
export const galleryClient = url && key ? createClient(url, key) : null;

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  year: number;
  event?: string;
}
