import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const rawUrl = (import.meta.env.VITE_SW_SUPABASE_URL || '') as string
const rawPublishableKey = (import.meta.env.VITE_SW_SUPABASE_KEY || '') as string

const supabaseUrl = rawUrl.replace(/^["']|["']$/g, '').trim()
const supabasePublishableKey = rawPublishableKey.replace(/^["']|["']$/g, '').trim()

// Safe diagnostics — report true/false only, never expose the actual key
export const SUPABASE_URL_PRESENT: boolean = Boolean(supabaseUrl && supabaseUrl.length > 0)
export const SUPABASE_KEY_PRESENT: boolean = Boolean(
  supabasePublishableKey &&
  supabasePublishableKey.length > 0 &&
  supabasePublishableKey !== 'sb_publishable_your_key_here' &&
  supabasePublishableKey !== 'placeholder-anon-key'
)

export const isSupabaseConfigured = (): boolean => {
  return SUPABASE_URL_PRESENT && SUPABASE_KEY_PRESENT
}

declare global {
  // eslint-disable-next-line no-var
  var __samewave_supabase: SupabaseClient | undefined
}

// Create single canonical Supabase client singleton with persistent session storage
export const supabase: SupabaseClient =
  globalThis.__samewave_supabase ||
  createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabasePublishableKey || 'placeholder-anon-key',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
      },
    }
  )

if (import.meta.env.DEV) {
  globalThis.__samewave_supabase = supabase
}

if (!isSupabaseConfigured()) {
  console.info(
    '[SameWave Supabase] Supabase client initialized in fallback mode. To enable live auth & realtime, add VITE_SW_SUPABASE_KEY to your .env file.'
  )
}
