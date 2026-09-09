import { supabase } from '@/lib/supabase'
import type { SavedMoment, RoomType } from '@/types'

export interface SaveMomentInput {
  roomId?: string | null
  roomTitle: string
  roomType: RoomType
  mindsGathered: number
  thoughtsShared: number
  connectionsFormed: number
  perspectivesEmerged: number
  highlightThoughts: string[]
}

/**
 * Save a moment directly to Supabase PostgreSQL (public.saved_moments)
 */
export async function saveMomentToDB(
  input: SaveMomentInput,
  userId: string
): Promise<{ data: SavedMoment | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('saved_moments')
      .insert({
        user_id: userId,
        room_id: input.roomId || null,
        room_title: input.roomTitle || 'Wavelength Space',
        room_type: input.roomType || 'text',
        minds_gathered: input.mindsGathered || 0,
        thoughts_shared: input.thoughtsShared || 0,
        connections_formed: input.connectionsFormed || 0,
        perspectives_emerged: Math.max(1, input.perspectivesEmerged || 1),
        highlight_thoughts: input.highlightThoughts || [],
      })
      .select('*')
      .single()

    if (error) {
      console.error('[moments] saveMomentToDB error:', error)
      return { data: null, error: error.message }
    }

    const moment: SavedMoment = {
      id: data.id,
      topicLabel: data.room_title,
      roomType: data.room_type as RoomType,
      savedAt: new Date(data.saved_at).getTime(),
      mindsGathered: data.minds_gathered,
      thoughtsShared: data.thoughts_shared,
      connectionsFormed: data.connections_formed,
      perspectivesEmerged: data.perspectives_emerged ?? 1,
      highlightThoughts: data.highlight_thoughts ?? [],
    }

    return { data: moment, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error saving moment'
    console.error('[moments] Unexpected saveMomentToDB exception:', err)
    return { data: null, error: message }
  }
}

/**
 * Fetch all moments saved by the current user from Supabase
 */
export async function fetchMySavedMoments(
  userId: string
): Promise<{ data: SavedMoment[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('saved_moments')
      .select('*')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })

    if (error) {
      console.error('[moments] fetchMySavedMoments error:', error)
      return { data: [], error: error.message }
    }

    const moments: SavedMoment[] = (data ?? []).map((row) => ({
      id: row.id,
      topicLabel: row.room_title,
      roomType: row.room_type as RoomType,
      savedAt: new Date(row.saved_at).getTime(),
      mindsGathered: row.minds_gathered,
      thoughtsShared: row.thoughts_shared,
      connectionsFormed: row.connections_formed,
      perspectivesEmerged: row.perspectives_emerged ?? 1,
      highlightThoughts: row.highlight_thoughts ?? [],
    }))

    return { data: moments, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching saved moments'
    console.error('[moments] Unexpected fetchMySavedMoments exception:', err)
    return { data: [], error: message }
  }
}

/**
 * Delete a saved moment from Supabase (RLS ensures user can only delete own moments)
 */
export async function deleteSavedMomentFromDB(
  momentId: string,
  userId: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('saved_moments')
      .delete()
      .eq('id', momentId)
      .eq('user_id', userId)

    if (error) {
      console.error('[moments] deleteSavedMomentFromDB error:', error)
      return { error: error.message }
    }

    return { error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error deleting saved moment'
    console.error('[moments] Unexpected deleteSavedMomentFromDB exception:', err)
    return { error: message }
  }
}
