const SUPABASE_URL = "https://ajqghagravnsuyekwnqe.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcWdoYWdyYXZuc3V5ZWt3bnFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MDg0NzUsImV4cCI6MjA5NjI4NDQ3NX0._qd_GN_x5B34NVuvu7gLSCw7oZ-eMAMsopOBAq9BY0U";

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("✅ Supabase conectado");