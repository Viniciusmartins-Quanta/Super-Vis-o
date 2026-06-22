import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL || "https://sfxyybvhxntsyfyiinov.supabase.co";
const supabaseKey = (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_9kEf6iB3I52g-MKMn8KqSA_8OzK82zf";

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
