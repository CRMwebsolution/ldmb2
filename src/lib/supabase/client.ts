import { createClient } from "@supabase/supabase-js";
import { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://shxpqufymaxwvwamlmmz.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoeHBxdWZ5bWF4d3Z3YW1sbW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NzM5NjksImV4cCI6MjA2MjA0OTk2OX0.o2TGdyJOPFgR4pJ2IZlbjk7rOyRXeq6-01zQu1kIGNI";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
