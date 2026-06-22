import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL || "https://sfxyybvhxntsyfyiinov.supabase.co";
const supabaseKey = (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHl5YnZoeG50c3lmeWlpbm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODcwNDQsImV4cCI6MjA5NzQ2MzA0NH0.kbBekuJeGhwaLeJHCP8rQhUsNE0ba4XIMfGVkLw26rA";

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
