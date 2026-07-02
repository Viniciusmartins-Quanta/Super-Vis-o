import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://sfxyybvhxntsyfyiinov.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHl5YnZoeG50c3lmeWlpbm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODcwNDQsImV4cCI6MjA5NzQ2MzA0NH0.kbBekuJeGhwaLeJHCP8rQhUsNE0ba4XIMfGVkLw26rA";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  const { data, error } = await supabase.from('obras').select('*').limit(1);
  if (error) {
    console.error("Connection failed:", error.message);
  } else {
    console.log("Connection successful:", data);
  }
}

testConnection();
