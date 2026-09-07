import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const googleLoginConfigured = Boolean(url && publishableKey);

export function supabaseBrowser() {
  if (!url || !publishableKey) {
    throw new Error("Login com Google ainda não foi configurado.");
  }
  return createClient(url, publishableKey, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      persistSession: true,
    },
  });
}
