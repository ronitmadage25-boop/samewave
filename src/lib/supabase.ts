import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://cewugwkgftolebynohqp.supabase.co') as string
const rawPublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '') as string

const supabaseUrl = rawUrl.replace(/^["']|["']$/g, '').trim()
const supabasePublishableKey = rawPublishableKey.replace(/^["']|["']$/g, '').trim()

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabasePublishableKey &&
    supabasePublishableKey.length > 0 &&
    supabasePublishableKey !== 'your-supabase-publishable-key' &&
    supabasePublishableKey !== 'placeholder-anon-key'
  )
}

declare global {
  // eslint-disable-next-line no-var
  var __samewave_supabase: SupabaseClient | undefined
}

// Create Supabase client singleton with persistent session storage
export const supabase: SupabaseClient =
  globalThis.__samewave_supabase ||
  createClient(
    supabaseUrl,
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
    '[SameWave Supabase] Supabase client initialized in fallback mode. To enable live database & auth, add VITE_SUPABASE_PUBLISHABLE_KEY to your .env file.'
  )
}
