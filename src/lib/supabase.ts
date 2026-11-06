import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function getSupabaseClient(rememberMe?: boolean): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "https://fzwbvccvqnbvzbqfgiep.supabase.co";
  const key =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    "sb_publishable_QHvUP4LtiZmAf1R8hckaow_el-EbunR";
  const browser = typeof window !== "undefined";
  const sessionOnly = browser && (rememberMe === false || (rememberMe === undefined && window.sessionStorage.getItem("mo:session-only") === "true"));
  if (browser && rememberMe !== undefined) {
    if (rememberMe) window.sessionStorage.removeItem("mo:session-only");
    else window.sessionStorage.setItem("mo:session-only", "true");
  }
  client = createClient(url, key, {
    auth: {
      storage: sessionOnly ? window.sessionStorage : window.localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
