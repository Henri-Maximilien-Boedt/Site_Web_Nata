import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

/**
 * Client Supabase côté navigateur (anon key).
 * À utiliser dans les pages et composants.
 * NE PAS utiliser dans pages/api/ → utiliser supabaseAdmin.js
 */
let client;

export function getSupabaseClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return client;
}

export const supabase = getSupabaseClient();
