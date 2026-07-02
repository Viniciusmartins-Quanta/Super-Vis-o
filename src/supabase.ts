import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "https://sfxyybvhxntsyfyiinov.supabase.co";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHl5YnZoeG50c3lmeWlpbm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODcwNDQsImV4cCI6MjA5NzQ2MzA0NH0.kbBekuJeGhwaLeJHCP8rQhUsNE0ba4XIMfGVkLw26rA";

console.log("Supabase Client Init - URL:", supabaseUrl);
console.log("Supabase Client Init - Key defined:", !!supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
