import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://sfxyybvhxntsyfyiinov.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHl5YnZoeG50c3lmeWlpbm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODcwNDQsImV4cCI6MjA5NzQ2MzA0NH0.kbBekuJeGhwaLeJHCP8rQhUsNE0ba4XIMfGVkLw26rA";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQuery() {
  console.log("--- Fetching one row from contrato_config to check columns ---");
  const { data, error } = await supabase.from("contrato_config").select("*");
  console.log("contrato_config rows:", data, "error:", error);
  if (data && data.length > 0) {
    console.log("contrato_config columns:", Object.keys(data[0]));
  }

  console.log("--- Fetching one row from aditivos to check columns ---");
  const { data: addData, error: addErr } = await supabase.from("aditivos").select("*");
  console.log("aditivos rows:", addData, "error:", addErr);
  if (addData && addData.length > 0) {
    console.log("aditivos columns:", Object.keys(addData[0]));
  }
}

testQuery();
