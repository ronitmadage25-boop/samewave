import type { Category, RoomType, LiveRoom, DbRoom } from '@/types'
import { supabase } from '@/lib/supabase'

export interface EphemeralRoomAdvertisement {
  roomId: string
  title: string
  roomType: RoomType
  category: Category
  creatorId: string
  creatorName: string
  creatorAvatar?: string | null
  creatorInitials?: string
  createdAt: string
  capacity: number
  currentPresenceCount: number
  description?: string
  expiresAt?: string | null
}

export interface CreateRoomInput {
  title: string
  type: RoomType
  category: Category
  description?: string
  capacity?: number
  durationMinutes?: number
  visibility?: 'public' | 'invite'
}

// In-memory registry of ephemeral rooms discovered via Supabase Realtime
const ephemeralRoomsMap = new Map<string, LiveRoom>()
let lobbyChannelInstance: ReturnType<typeof supabase.channel> | null = null

export function toLiveRoom(ad: EphemeralRoomAdvertisement): LiveRoom {
  return {
    id: ad.roomId,
    title: ad.title || 'Untitled Wavelength',
    type: ad.roomType || 'video',
    category: ad.category || 'Tech',
    description: ad.description || null,
    visibility: 'public',
    status: 'active',
    capacity: ad.capacity || 32,
    duration_minutes: 45,
    member_count: Math.max(1, ad.currentPresenceCount || 1),
    host_name: ad.creatorName || 'Wave Rider',
    host_avatar: ad.creatorAvatar ?? null,
    host_initials: ad.creatorInitials || 'WR',
    created_at: ad.createdAt || new Date().toISOString(),
    expires_at: ad.expiresAt ?? null,
    tools: ['reactions', 'thought-graph'],
  }
}

// ── PERSISTENT ROOM DB FUNCTIONS ────────────────────────────────────────────
// The existing schema uses: host_id, type, category, visibility, capacity, duration_minutes
// We map creator_id → host_id, room_type → type in queries

/**
 * Create a persistent room record in Supabase (PostgreSQL).
 * This is separate from the ephemeral live session.
 */
export async function createRoomInDB(
  input: CreateRoomInput,
  creatorId: string
): Promise<{ data: DbRoom | null; error: string | null }> {
  // First ensure a profile row exists for this user (needed for host FK)
  try {
    const { data: authData } = await supabase.auth.getUser()
    const u = authData?.user
    if (u && u.id === creatorId) {
      await supabase.from('profiles').upsert({
        id: creatorId,
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
    .from('rooms')
    .insert({
      host_id: creatorId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      type: input.type,
      category: input.category,
      visibility: input.visibility ?? 'public',
      capacity: input.capacity ?? 32,
      duration_minutes: input.durationMinutes ?? 45,
      status: 'active',
    })
    .select(`
      id,
      host_id,
      title,
      description,
      type,
      category,
      visibility,
      capacity,
      status,
      created_at,
      updated_at,
      creator:profiles!host_id(display_name, avatar_url, initials)
    `)
    .single()

  if (error) {
    console.error('[rooms] createRoomInDB error:', error)
    return { data: null, error: error.message }
  }

  // Normalize to DbRoom shape
  const raw = data as unknown as {
    id: string
    host_id: string
    title: string
    description: string | null
    type: string
    category: string
    visibility: string
    capacity: number
    status: string
    created_at: string
    updated_at: string
    creator: { display_name: string; avatar_url: string | null; initials: string }[] | null
  }

  // Supabase returns FK join as array — take first element
  const creatorArr = raw.creator
  const creator = Array.isArray(creatorArr) ? (creatorArr[0] ?? null) : (creatorArr ?? null)

  const normalized: DbRoom = {
    id: raw.id,
    creator_id: raw.host_id,
    title: raw.title,
    description: raw.description,
    room_type: raw.type as RoomType,
    category: raw.category as Category,
    visibility: (raw.visibility === 'public' ? 'public' : 'invite') as 'public' | 'invite',
    capacity: raw.capacity,
    status: raw.status as 'active' | 'ended',
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    creator: creator ? {
      display_name: creator.display_name,
      avatar_url: creator.avatar_url,
      initials: creator.initials,
    } : null,
  }

  return { data: normalized, error: null }
}

/**
 * Fetch all public rooms from Supabase.
 */
export async function fetchAllPublicRooms(): Promise<{ data: DbRoom[]; error: string | null }> {
  const { data, error } = await supabase
    .from('rooms')
    .select(`
      id, host_id, title, description, type, category, visibility, capacity, status, created_at, updated_at,
      creator:profiles!host_id(display_name, avatar_url, initials)
    `)
    .eq('visibility', 'public')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[rooms] fetchAllPublicRooms error:', error)
    return { data: [], error: error.message }
  }

  return { data: normalizeRooms(data ?? []), error: null }
}

/**
 * Fetch rooms owned by the current user.
 */
export async function fetchMyRooms(creatorId: string): Promise<{ data: DbRoom[]; error: string | null }> {
  const { data, error } = await supabase
    .from('rooms')
    .select(`
      id, host_id, title, description, type, category, visibility, capacity, status, created_at, updated_at,
      creator:profiles!host_id(display_name, avatar_url, initials)
    `)
    .eq('host_id', creatorId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[rooms] fetchMyRooms error:', error)
    return { data: [], error: error.message }
  }
  return { data: normalizeRooms(data ?? []), error: null }
}

/**
 * Delete a room by ID. RLS ensures only the owner can delete.
 */
export async function deleteRoomFromDB(roomId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('rooms')
    .update({ status: 'ended' })
    .eq('id', roomId)

  if (error) {
    console.error('[rooms] deleteRoomFromDB error:', error)
    return { error: error.message }
  }
  return { error: null }
}

type RawRoom = {
  id: string
  host_id: string
  title: string
  description: string | null
  type: string
  category: string
  visibility: string
  capacity: number
  status: string
  created_at: string
  updated_at: string
  creator?: { display_name: string; avatar_url: string | null; initials: string }[] | null
}

function normalizeRooms(rows: unknown[]): DbRoom[] {
  return (rows as RawRoom[]).map((raw) => {
    // Supabase returns FK joins as arrays — take first element
    const creatorArr = raw.creator as unknown as { display_name: string; avatar_url: string | null; initials: string }[] | null
    const creator = Array.isArray(creatorArr) ? (creatorArr[0] ?? null) : (creatorArr ?? null)
    return {
      id: raw.id,
      creator_id: raw.host_id,
      title: raw.title,
      description: raw.description,
      room_type: raw.type as RoomType,
      category: raw.category as Category,
      visibility: (raw.visibility === 'public' ? 'public' : 'invite') as 'public' | 'invite',
      capacity: raw.capacity,
      status: raw.status as 'active' | 'ended',
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      creator: creator ? {
        display_name: creator.display_name,
        avatar_url: creator.avatar_url,
        initials: creator.initials,
      } : null,
    }
  })
}

// ── EPHEMERAL LOBBY (Supabase Realtime) ─────────────────────────────────────

/**
 * Advertises an active room to the global ephemeral lobby (samewave-lobby).
 * Uses Realtime Presence so presence is automatically removed when host/browser disconnects.
 */
export function advertiseRoomInLobby(ad: EphemeralRoomAdvertisement): {
  updateCount: (count: number) => void
  cleanup: () => void
} {
  let currentAd = { ...ad }
  const channel = supabase.channel('samewave-lobby', {
    config: { presence: { key: `room_${ad.roomId}` } },
  })

  const sendAdBroadcast = () => {
    try {
      channel.send({
        type: 'broadcast',
        event: 'room-advertisement',
        payload: currentAd,
      })
    } catch {}
  }

  channel
    .on('broadcast', { event: 'lobby-ping' }, () => {
      sendAdBroadcast()
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await channel.track(currentAd)
          sendAdBroadcast()
        } catch (err) {
          console.error('[lobby] failed to track room presence:', err)
        }
      }
    })

  return {
    updateCount: (count: number) => {
      currentAd = { ...currentAd, currentPresenceCount: count }
      try {
        channel.track(currentAd)
        sendAdBroadcast()
      } catch {}
    },
    cleanup: () => {
      try {
        channel.send({
          type: 'broadcast',
          event: 'room-ended',
          payload: { roomId: ad.roomId },
        })
        channel.untrack()
        channel.unsubscribe()
      } catch {}
    },
  }
}

/**
 * Subscribes the Rooms/Discover page to the global ephemeral lobby (samewave-lobby).
 */
export function subscribeToLobby(onUpdate: (rooms: LiveRoom[]) => void): () => void {
  const channel = supabase.channel('samewave-lobby', {
    config: { presence: { key: `visitor_${Math.random().toString(36).slice(2, 8)}` } },
  })
  lobbyChannelInstance = channel

  const dispatchUpdate = () => {
    const list = Array.from(ephemeralRoomsMap.values())
    onUpdate(list)
  }

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const seenRoomIds = new Set<string>()

      for (const [key, presences] of Object.entries(state)) {
        if (!key.startsWith('room_')) continue
        const list = presences as unknown as EphemeralRoomAdvertisement[]
        if (list.length === 0) continue
        const latest = list[list.length - 1]
        if (latest.roomId) {
          seenRoomIds.add(latest.roomId)
          ephemeralRoomsMap.set(latest.roomId, toLiveRoom(latest))
        }
      }

      for (const existingId of Array.from(ephemeralRoomsMap.keys())) {
        if (!seenRoomIds.has(existingId)) {
          ephemeralRoomsMap.delete(existingId)
        }
      }

      dispatchUpdate()
    })
    .on('broadcast', { event: 'room-advertisement' }, ({ payload }) => {
      if (payload && payload.roomId) {
        ephemeralRoomsMap.set(payload.roomId, toLiveRoom(payload as EphemeralRoomAdvertisement))
        dispatchUpdate()
      }
    })
    .on('broadcast', { event: 'room-ended' }, ({ payload }) => {
      if (payload && payload.roomId) {
        ephemeralRoomsMap.delete(payload.roomId)
        dispatchUpdate()
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        try {
          channel.send({
            type: 'broadcast',
            event: 'lobby-ping',
            payload: { timestamp: Date.now() },
          })
        } catch {}
      }
    })

  dispatchUpdate()

  return () => {
    try {
      channel.unsubscribe()
      if (lobbyChannelInstance === channel) {
        lobbyChannelInstance = null
      }
    } catch {}
  }
}

/**
 * Fetch all currently active ephemeral rooms (zero DB query).
 */
export async function fetchRooms(): Promise<{ data: LiveRoom[]; error: string | null }> {
  return { data: Array.from(ephemeralRoomsMap.values()), error: null }
}

/**
 * End an ephemeral room and broadcast notice to the lobby.
 */
export async function endRoom(roomId: string, _hostId?: string): Promise<{ error: string | null }> {
  ephemeralRoomsMap.delete(roomId)
  if (lobbyChannelInstance) {
    try {
      lobbyChannelInstance.send({
        type: 'broadcast',
        event: 'room-ended',
        payload: { roomId },
      })
    } catch {}
  }
  return { error: null }
}
