import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://sfxyybvhxntsyfyiinov.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHl5YnZoeG50c3lmeWlpbm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODcwNDQsImV4cCI6MjA5NzQ2MzA0NH0.kbBekuJeGhwaLeJHCP8rQhUsNE0ba4XIMfGVkLw26rA";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQuery() {
  console.log("--- Querying policies ---");
  const { data: policies, error: polErr } = await supabase.rpc("get_policies");
  console.log("Policies RPC data:", policies, "error:", polErr);

  console.log("--- Querying public tables ---");
  const { data: tables, error: tabErr } = await supabase.from("aditivos").select("*").limit(1);
  console.log("Aditivos limit 1 data:", tables, "error:", tabErr);
}

testQuery();
