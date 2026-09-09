import type { Category, RoomType, RoomTool } from '@/types'
import { supabase } from '@/lib/supabase'

export interface DbRoom {
  id: string
  host_id: string
  title: string
  description: string | null
  type: RoomType
  category: Category
  visibility: 'public' | 'private' | 'invite'
  status: 'active' | 'ended' | 'cancelled'
  capacity: number
  duration_minutes: number
  tools: string[]
  expires_at: string | null
  created_at: string
  updated_at: string
  // From view
  host_name?: string
  host_avatar?: string | null
  host_initials?: string
  member_count?: number
}

export interface CreateRoomInput {
  title: string
  type: RoomType
  category: Category
  description?: string
  capacity?: number
  durationMinutes?: number
  visibility?: 'public' | 'invite'
  tools?: RoomTool[]
}

/**
 * Fetch all active public rooms with member counts.
 */
export async function fetchRooms(): Promise<{ data: DbRoom[]; error: string | null }> {
  const { data, error } = await supabase
    .from('rooms_with_counts')
    .select('*')
    .eq('status', 'active')
    .eq('visibility', 'public')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[rooms] fetchRooms error:', error)
    return { data: [], error: error.message }
  }
  return { data: data ?? [], error: null }
}

/**
 * Fetch a single room by ID (with counts).
 */
export async function fetchRoomById(roomId: string): Promise<{ data: DbRoom | null; error: string | null }> {
  const { data, error } = await supabase
    .from('rooms_with_counts')
    .select('*')
    .eq('id', roomId)
    .single()

  if (error) {
    console.error('[rooms] fetchRoomById error:', error)
    return { data: null, error: error.message }
  }
  return { data, error: null }
}

/**
 * Create a new room. Returns the newly created room.
 */
export async function createRoom(
  input: CreateRoomInput,
  hostId: string
): Promise<{ data: DbRoom | null; error: string | null }> {
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      host_id: hostId,
      title: input.title,
      description: input.description ?? null,
      type: input.type,
      category: input.category,
      capacity: input.capacity ?? 20,
      duration_minutes: input.durationMinutes ?? 45,
      visibility: input.visibility ?? 'public',
      tools: input.tools ?? ['reactions', 'thought-graph'],
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    console.error('[rooms] createRoom error:', error)
    return { data: null, error: error.message }
  }

  // Add host as a member with host role
  if (data) {
    const { error: memberErr } = await supabase
      .from('room_members')
      .insert({
        room_id: data.id,
        user_id: hostId,
        role: 'host',
      })
    if (memberErr) {
      console.error('[rooms] failed to add host as member:', memberErr)
    }

    // Log activity event
    await supabase.from('activity_events').insert({
      user_id: hostId,
      room_id: data.id,
      event_type: input.type === 'audio'
        ? 'audio-room-started'
        : input.type === 'video'
          ? 'video-room-started'
          : 'room-created',
      title: `A wavelength formed: "${input.title}"`,
      subtitle: `${input.type} room · ${input.durationMinutes ?? 45}m`,
      room_label: input.title,
      room_type: input.type,
    })
  }

  return { data, error: null }
}

/**
 * Join a room. Enforces capacity and prevents duplicate membership.
 */
export async function joinRoom(
  roomId: string,
  userId: string
): Promise<{ error: string | null }> {
  // Check room exists, is active, and has capacity
  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .select('id, status, capacity, expires_at')
    .eq('id', roomId)
    .single()

  if (roomErr || !room) {
    return { error: 'Room not found.' }
  }
  if (room.status !== 'active') {
    return { error: 'This wavelength has ended.' }
  }
  if (room.expires_at && new Date(room.expires_at) < new Date()) {
    return { error: 'This wavelength has expired.' }
  }

  // Count current active members
  const { count } = await supabase
    .from('room_members')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .is('left_at', null)

  if ((count ?? 0) >= room.capacity) {
    return { error: 'Looks like this wavelength is full.' }
  }

  // Upsert membership (re-joining after leave is allowed)
  const { error: joinErr } = await supabase
    .from('room_members')
    .upsert(
      { room_id: roomId, user_id: userId, role: 'member', left_at: null, joined_at: new Date().toISOString() },
      { onConflict: 'room_id,user_id' }
    )

  if (joinErr) {
    console.error('[rooms] joinRoom error:', joinErr)
    return { error: joinErr.message }
  }

  return { error: null }
}

/**
 * Leave a room. Sets left_at timestamp.
 */
export async function leaveRoom(
  roomId: string,
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('room_members')
    .update({ left_at: new Date().toISOString() })
    .eq('room_id', roomId)
    .eq('user_id', userId)

  if (error) {
    console.error('[rooms] leaveRoom error:', error)
    return { error: error.message }
  }
  return { error: null }
}

/**
 * End a room (host only). Sets status to 'ended'.
 */
export async function endRoom(
  roomId: string,
  _hostId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('rooms')
    .update({ status: 'ended' })
    .eq('id', roomId)

  if (error) {
    console.error('[rooms] endRoom error:', error)
    return { error: error.message }
  }
  return { error: null }
}

/**
 * Fetch active members of a room.
 */
export async function fetchRoomMembers(roomId: string) {
  const { data, error } = await supabase
    .from('room_members')
    .select(`
      *,
      profile:profiles(id, display_name, avatar_url, initials)
    `)
    .eq('room_id', roomId)
    .is('left_at', null)

  if (error) {
    console.error('[rooms] fetchRoomMembers error:', error)
    return { data: [], error: error.message }
  }
  return { data: data ?? [], error: null }
}
