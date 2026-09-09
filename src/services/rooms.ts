import type { Category, RoomType, LiveRoom } from '@/types'
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

/**
 * Advertises an active room to the global ephemeral lobby (samewave-lobby).
 * Uses Realtime Presence so presence is automatically removed when host/browser disconnects.
 * Also responds to lobby-ping broadcasts from late subscribers.
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
      // Immediate response to newly connected clients
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
 * Receives presence sync (handles late subscribers) & instant broadcasts.
 */
export function subscribeToLobby(onUpdate: (rooms: LiveRoom[]) => void): () => void {
  // Return existing channel if already listening, or create new
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

      // Remove any rooms that dropped out of presence
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
        // Send a ping so any already active rooms immediately respond with an advertisement
        try {
          channel.send({
            type: 'broadcast',
            event: 'lobby-ping',
            payload: { timestamp: Date.now() },
          })
        } catch {}
      }
    })

  // Initial dispatch
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
 * Create a new ephemeral room session (purely client-generated, zero PostgreSQL storage).
 */
export async function createRoom(
  input: CreateRoomInput,
  _hostId: string
): Promise<{ data: LiveRoom | null; error: string | null }> {
  const roomId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const room: LiveRoom = {
    id: roomId,
    title: input.title,
    type: input.type,
    category: input.category,
    description: input.description ?? null,
    visibility: input.visibility ?? 'public',
    status: 'active',
    capacity: input.capacity ?? 32,
    duration_minutes: input.durationMinutes ?? 45,
    member_count: 1,
    host_name: 'You',
    created_at: new Date().toISOString(),
    expires_at: null,
    tools: ['reactions', 'thought-graph'],
  }

  ephemeralRoomsMap.set(roomId, room)
  return { data: room, error: null }
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
