import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Browser-only Supabase client used purely for Realtime broadcast on chat threads.
// Returns null if env isn't configured, so callers fall back to polling gracefully.
let client: SupabaseClient | null = null

export function getRealtime(): SupabaseClient | null {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 20 } },
  })
  return client
}
