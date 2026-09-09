import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface UserProfile {
  id: string
  email?: string
  displayName: string
  avatarUrl: string | null
  initials: string
}

export interface AuthState {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  isConfigured: boolean
}

// Derive a user profile directly from authenticated Google User object (Auth only, no database)
export function getProfileFromUser(user: User | null): UserProfile | null {
  if (!user) return null

  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.display_name ||
    user.email?.split('@')[0] ||
    'Wave Rider'

  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part: string) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'WR'

  return {
    id: user.id,
    email: user.email,
    displayName: name,
    avatarUrl,
    initials,
  }
}

// Trigger Google OAuth sign-in via Supabase Auth
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return {
      error: new Error(
        'Supabase is not yet configured with VITE_SUPABASE_PUBLISHABLE_KEY in .env.'
      ),
    }
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) throw error
    return { error: null }
  } catch (err: any) {
    console.error('[SameWave Auth] Google sign-in failed:', err)
    return { error: err }
  }
}

// Sign out from Supabase Auth
export async function signOut(): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: null }
  }

  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (err: any) {
    console.error('[SameWave Auth] Sign out failed:', err)
    return { error: err }
  }
}

// Get the current Supabase session
export async function getCurrentSession(): Promise<{ session: Session | null; user: User | null }> {
  if (!isSupabaseConfigured()) {
    return { session: null, user: null }
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    return { session, user: session?.user ?? null }
  } catch {
    return { session: null, user: null }
  }
}
