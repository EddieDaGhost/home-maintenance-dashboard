// Where the shared household lives.
//
// Both values below are meant to be public. The anon key is designed to ship
// inside client-side JavaScript — it is in the bundle of every Supabase app —
// and it grants nothing on its own: every table has Row Level Security on with
// no policies, so the only way in is the two functions in supabase/schema.sql,
// which check a household key first.
//
// What you must not paste here is the `service_role` key. That one bypasses
// everything.

export const SUPABASE_URL = 'https://fklysqgcinkibqbgdluw.supabase.co'

export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbHlzcWdjaW5raWJxYmdkbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3ODU4MTYsImV4cCI6MjEwMjM2MTgxNn0.hpUu4k-OsineTlwURBDuSas3F6KGiqWDaxEO6KiCGkE'

/**
 * Lets the test suite point the app at a local stand-in for Supabase, so the
 * request shapes are exercised for real rather than mocked. Unused in normal
 * running — if this key isn't set, the constants above are used.
 */
export const ENDPOINT_OVERRIDE_KEY = 'home-maintenance-dashboard/sync-endpoint'

export function syncEndpoint() {
  if (typeof window !== 'undefined') {
    try {
      const override = window.localStorage.getItem(ENDPOINT_OVERRIDE_KEY)
      if (override) return { url: override, anonKey: 'test' }
    } catch {
      // fall through to the real one
    }
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY }
}
