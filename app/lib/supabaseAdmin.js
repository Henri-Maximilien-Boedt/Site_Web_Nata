import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase avec la service role key.
 * ⚠️  À utiliser UNIQUEMENT dans pages/api/ — jamais côté client.
 * Bypass les RLS — ne pas exposer au navigateur.
 */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default supabaseAdmin;
