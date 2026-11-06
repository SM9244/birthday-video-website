const SUPABASE_URL = "https://uyofqasjqjzorqacsaqj.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_FWX6o_03cIIin7XZHS4XlA_jBZL_rBa";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
