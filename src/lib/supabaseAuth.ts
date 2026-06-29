import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Browser Supabase client dedicated to OAuth (Google / Apple).
//
// The OAuth + PKCE exchange runs in the browser so the per-user code-verifier is
// stored client-side (in localStorage under `caddie_oauth`) and survives the
// provider redirect. We deliberately disable autoRefreshToken — the app manages
// its own token lifecycle via /auth/refresh + the `caddie_token` store — and copy
// the resulting session into that store, then sign this client out locally.
let client: SupabaseClient | null = null

export function getSupabaseAuth(): SupabaseClient | null {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  client = createClient(url, key, {
    auth: {
      persistSession: true,        // keep the PKCE verifier across the redirect
      autoRefreshToken: false,
      detectSessionInUrl: false,   // we exchange the code explicitly
      flowType: 'pkce',
      storageKey: 'caddie_oauth',
    },
  })
  return client
}
