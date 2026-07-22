import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://sfxyybvhxntsyfyiinov.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHl5YnZoeG50c3lmeWlpbm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODcwNDQsImV4cCI6MjA5NzQ2MzA0NH0.kbBekuJeGhwaLeJHCP8rQhUsNE0ba4XIMfGVkLw26rA";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQuery() {
  console.log("--- Updating contrato_config with an extra property ---");
  const { data, error } = await supabase.from("contrato_config").upsert({
    id: "config-atual",
    some_random_property: "test"
  });
  console.log("Update random property error:", error);
}

testQuery();
