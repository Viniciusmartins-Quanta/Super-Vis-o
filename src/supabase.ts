import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "https://jaopixixqfcbszwuceuc.supabase.co";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphb3BpeGl4cWZjYnN6d3VjZXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4Nzk1OTksImV4cCI6MjA5NzQ1NTU5OX0.Kg3VkiB7ulWsiyH93vnz99rbDnKHt6jl4VYehKK2Co8";
const supabasePublishableKey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_fkjiMmc4n_8-bcalSaYoIA_hgGPIZN3"

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
