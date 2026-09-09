import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { SignalReaction } from '@/types'

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

/**
 * Derives a UserProfile from a Supabase Auth user object.
 * Does NOT hit the database — uses auth metadata.
 */
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

/**
 * Upsert a profile row for the authenticated user.
 * Called on every sign-in to keep profile in sync.
 */
export async function upsertProfile(user: User): Promise<void> {
  const profile = getProfileFromUser(user)
  if (!profile) return

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        display_name: profile.displayName,
        avatar_url: profile.avatarUrl,
        initials: profile.initials,
        email: profile.email,
      },
      { onConflict: 'id' }
    )

  if (error) {
    console.error('[auth] upsertProfile error:', error)
  }
}

/**
 * Trigger Google OAuth sign-in via Supabase Auth
 */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return {
      error: new Error('Supabase is not yet configured with VITE_SW_SUPABASE_KEY in .env.'),
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
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err))
    console.error('[SameWave Auth] Google sign-in failed:', e)
    return { error: e }
  }
}

/**
 * Sign out from Supabase Auth
 */
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err))
    console.error('[SameWave Auth] Sign out failed:', e)
    return { error: e }
  }
}

/**
 * Get the current Supabase session
 */
export async function getCurrentSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return { session, user: session?.user ?? null }
  } catch {
    return { session: null, user: null }
  }
}

// ── Daily Signals ──────────────────────────────────────────────────────────

export interface DbDailySignal {
  id: string
  user_id: string
  content: string
  signal_date: string
  created_at: string
  profile?: {
    id: string
    display_name: string
    avatar_url: string | null
    initials: string
  }
  reactions?: DbSignalReaction[]
}

export interface DbSignalReaction {
  id: string
  signal_id: string
  user_id: string
  reaction: SignalReaction
  created_at: string
}

/**
 * Fetch today's daily signals with author profiles and reactions.
 */
export async function fetchTodaysSignals(): Promise<{ data: DbDailySignal[]; error: string | null }> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('daily_signals')
    .select(`
      *,
      profile:profiles(id, display_name, avatar_url, initials),
      reactions:signal_reactions(id, signal_id, user_id, reaction, created_at)
    `)
    .eq('signal_date', today)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[signals] fetchTodaysSignals error:', error)
    return { data: [], error: error.message }
  }
  return { data: data ?? [], error: null }
}

/**
 * Publish a daily signal (one per user per day).
 */
export async function publishDailySignal(
  userId: string,
  content: string
): Promise<{ data: DbDailySignal | null; error: string | null }> {
  const today = new Date().toISOString().split('T')[0]

  try {
    const { data: authData } = await supabase.auth.getUser()
    const u = authData?.user
    if (u && u.id === userId) {
      await supabase.from('profiles').upsert({
        id: userId,
        display_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Wave Rider',
        avatar_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
        initials: 'WR',
        email: u.email || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
    }
  } catch {
    // Non-fatal safeguard
  }

  const { data, error } = await supabase
    .from('daily_signals')
    .insert({
      user_id: userId,
      content,
      signal_date: today,
    })
    .select(`
      *,
      profile:profiles(id, display_name, avatar_url, initials)
    `)
    .single()

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: 'You have already published a signal today.' }
    }
    console.error('[signals] publishDailySignal error:', error)
    return { data: null, error: error.message }
  }
  return { data, error: null }
}

/**
 * React to a daily signal (upsert — one per user per signal).
 * If same reaction, deletes it (toggle off).
 */
export async function reactToSignal(
  signalId: string,
  userId: string,
  reaction: SignalReaction,
  existingReaction?: SignalReaction
): Promise<{ error: string | null }> {
  if (existingReaction === reaction) {
    const { error } = await supabase
      .from('signal_reactions')
      .delete()
      .eq('signal_id', signalId)
      .eq('user_id', userId)
    return { error: error?.message ?? null }
  }

  const { error } = await supabase
    .from('signal_reactions')
    .upsert(
      { signal_id: signalId, user_id: userId, reaction },
      { onConflict: 'signal_id,user_id' }
    )
  return { error: error?.message ?? null }
}

/**
 * Check if the current user has already published today's signal.
 */
export async function hasPublishedTodaySignal(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]
  const { count } = await supabase
    .from('daily_signals')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('signal_date', today)
  return (count ?? 0) > 0
}
