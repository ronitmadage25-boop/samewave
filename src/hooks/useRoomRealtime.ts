import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Thought, ThoughtConnection, Participant, ReactionType, WhiteboardStroke } from '@/types'

/**
 * useRoomRealtime
 *
 * Subscribes to all realtime events for a room:
 * - Supabase DB changes: new messages, reactions, room_members, thought_connections
 * - Supabase Presence: who is currently online in the room
 * - Supabase Broadcast: high-frequency whiteboard strokes
 *
 * Returns a cleanup function (also handled automatically on unmount).
 */
export function useRoomRealtime(roomId: string | undefined, selfParticipant: Participant | null) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const presenceChannelRef = useRef<RealtimeChannel | null>(null)

  const user = useAppStore((s) => s.user)
  const profile = useAppStore((s) => s.profile)
  const addThoughtFromRealtime = useAppStore((s) => s.addThoughtFromRealtime)
  const addConnectionFromRealtime = useAppStore((s) => s.addConnectionFromRealtime)
  const addParticipant = useAppStore((s) => s.addParticipant)
  const removeParticipant = useAppStore((s) => s.removeParticipant)
  const updateParticipant = useAppStore((s) => s.updateParticipant)
  const setParticipants = useAppStore((s) => s.setParticipants)
  const addStroke = useAppStore((s) => s.addStroke)

  useEffect(() => {
    if (!roomId) return

    // ── DB Changes Channel ───────────────────────────────────────────────
    const channel = supabase
      .channel(`room:${roomId}:db`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          // Fetch the full message with author + reactions
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              author:profiles(id, display_name, avatar_url, initials),
              reactions(id, message_id, user_id, reaction, created_at)
            `)
            .eq('id', payload.new.id)
            .single()

          if (!data) return

          // Skip if this is our own message (already optimistically added)
          if (data.author_id === user?.id) return

          const thought: Thought = {
            id: data.id,
            authorId: data.author_id,
            authorName: data.author?.display_name,
            authorInitials: data.author?.initials,
            authorAvatar: data.author?.avatar_url,
            type: data.type,
            text: data.content,
            code: data.code ?? undefined,
            language: data.language ?? undefined,
            url: data.url ?? undefined,
            pollOptions: data.poll_options?.map((o: { id: string; label: string; votes: number }) => ({ ...o, myVote: false })),
            createdAt: new Date(data.created_at).getTime(),
            reactions: [
              { type: 'relate' as const, count: 0 },
              { type: 'made-me-think' as const, count: 0 },
              { type: 'tell-me-more' as const, count: 0 },
              { type: 'different-take' as const, count: 0 },
              { type: 'inspired' as const, count: 0 },
              { type: 'made-me-pause' as const, count: 0 },
            ],
            isPriority: data.is_priority,
            parentId: data.parent_id ?? undefined,
          }

          addThoughtFromRealtime(thought)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reactions' },
        async (payload) => {
          // Refresh reactions for the affected message
          const messageId = payload.new.message_id
          const { data } = await supabase
            .from('reactions')
            .select('reaction, user_id')
            .eq('message_id', messageId)

          if (!data) return

          const room = useAppStore.getState().activeRoom
          if (!room) return

          const reactionCounts: Record<string, number> = {}
          let myReaction: ReactionType | undefined

          for (const r of data) {
            reactionCounts[r.reaction] = (reactionCounts[r.reaction] ?? 0) + 1
            if (r.user_id === user?.id) myReaction = r.reaction as ReactionType
          }

          const updatedThoughts = room.thoughts.map(t => {
            if (t.id !== messageId) return t
            return {
              ...t,
              reactions: [
                { type: 'relate' as const, count: reactionCounts['relate'] ?? 0 },
                { type: 'made-me-think' as const, count: reactionCounts['made-me-think'] ?? 0 },
                { type: 'tell-me-more' as const, count: reactionCounts['tell-me-more'] ?? 0 },
                { type: 'different-take' as const, count: reactionCounts['different-take'] ?? 0 },
                { type: 'inspired' as const, count: reactionCounts['inspired'] ?? 0 },
                { type: 'made-me-pause' as const, count: reactionCounts['made-me-pause'] ?? 0 },
              ],
              myReaction,
            }
          })

          useAppStore.setState(s => ({
            activeRoom: s.activeRoom ? { ...s.activeRoom, thoughts: updatedThoughts } : null,
          }))
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'thought_connections', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          if (payload.new.created_by === user?.id) return // Already added optimistically

          const connection: ThoughtConnection = {
            id: payload.new.id,
            fromThoughtId: payload.new.from_message_id,
            toThoughtId: payload.new.to_message_id,
            relationship: payload.new.relationship,
          }
          addConnectionFromRealtime(connection)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          if (payload.new.user_id === user?.id) return // That's us

          // Fetch the new member's profile
          const { data } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url, initials')
            .eq('id', payload.new.user_id)
            .single()

          if (!data) return

          const currentRoom = useAppStore.getState().activeRoom
          const idx = currentRoom?.participants.length ?? 0

          addParticipant({
            id: data.id,
            name: data.display_name,
            initials: data.initials,
            avatarUrl: data.avatar_url,
            colorSeed: idx % 12,
            isSelf: false,
            presenceState: 'active',
            isMuted: true,
            hasVideo: false,
            handRaised: false,
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
        (payload) => {
          // If a member set left_at (left the room)
          if (payload.new.left_at && !payload.old.left_at) {
            if (payload.new.user_id !== user?.id) {
              removeParticipant(payload.new.user_id)
            }
          }
        }
      )
      // Whiteboard strokes via Broadcast (high-frequency, not stored in DB)
      .on('broadcast', { event: 'whiteboard-stroke' }, ({ payload }) => {
        if (payload.participantId === user?.id) return // Skip our own
        const stroke = payload as WhiteboardStroke
        addStroke(stroke)
      })
      // Thoughts via Broadcast (instant multi-device sync)
      .on('broadcast', { event: 'thought-broadcast' }, ({ payload }) => {
        if (!payload || payload.authorId === user?.id) return
        addThoughtFromRealtime(payload as Thought)
      })
      // Reactions via Broadcast
      .on('broadcast', { event: 'reaction-broadcast' }, ({ payload }) => {
        if (!payload || payload.userId === user?.id) return
        const currentRoom = useAppStore.getState().activeRoom
        if (!currentRoom) return
        const updated = currentRoom.thoughts.map((t) => {
          if (t.id !== payload.messageId) return t
          const reactions = t.reactions.map((r) =>
            r.type === payload.reaction ? { ...r, count: r.count + 1 } : r
          )
          return { ...t, reactions }
        })
        useAppStore.setState({ activeRoom: { ...currentRoom, thoughts: updated } })
      })
      // Connections via Broadcast
      .on('broadcast', { event: 'connection-broadcast' }, ({ payload }) => {
        if (!payload) return
        addConnectionFromRealtime(payload as ThoughtConnection)
      })
      .subscribe()

    channelRef.current = channel

    // ── Presence Channel ─────────────────────────────────────────────────
    const presenceChannel = supabase.channel(`room:${roomId}:presence`, {
      config: { presence: { key: user?.id ?? 'anon' } },
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const room = useAppStore.getState().activeRoom
        if (!room) return

        // Build participants from presence state
        const presenceParticipants: Participant[] = []
        for (const [_key, presences] of Object.entries(state)) {
          const presenceArr = presences as unknown as Array<{
            userId: string
            displayName: string
            initials: string
            avatarUrl: string | null
            isMuted: boolean
            hasVideo: boolean
            handRaised: boolean
            presenceState: string
            colorSeed?: number
          }>
          if (presenceArr.length === 0) continue
          const p = presenceArr[presenceArr.length - 1]
          presenceParticipants.push({
            id: p.userId,
            name: p.displayName,
            initials: p.initials,
            avatarUrl: p.avatarUrl,
            colorSeed: p.colorSeed ?? 0,
            isSelf: p.userId === user?.id,
            presenceState: (p.presenceState as Participant['presenceState']) || 'active',
            isMuted: p.isMuted,
            hasVideo: p.hasVideo,
            handRaised: p.handRaised,
          })
        }

        if (presenceParticipants.length > 0) {
          setParticipants(presenceParticipants)
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        for (const p of (newPresences as unknown as Array<{
          userId: string
          displayName: string
          initials: string
          avatarUrl: string | null
          isMuted: boolean
          hasVideo: boolean
          handRaised: boolean
          presenceState: string
          colorSeed?: number
        }>)) {
          if (p.userId === user?.id) continue
          addParticipant({
            id: p.userId,
            name: p.displayName,
            initials: p.initials,
            avatarUrl: p.avatarUrl,
            colorSeed: p.colorSeed ?? 0,
            isSelf: false,
            presenceState: (p.presenceState as Participant['presenceState']) || 'active',
            isMuted: p.isMuted,
            hasVideo: p.hasVideo,
            handRaised: p.handRaised,
          })
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        for (const p of (leftPresences as unknown as Array<{ userId: string }>) ) {
          if (p.userId !== user?.id) {
            removeParticipant(p.userId)
          }
        }
      })
      .on('broadcast', { event: 'participant-state' }, ({ payload }) => {
        if (payload.userId === user?.id) return
        updateParticipant(payload.userId, {
          isMuted: payload.isMuted,
          hasVideo: payload.hasVideo,
          handRaised: payload.handRaised,
          presenceState: payload.presenceState,
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user && profile) {
          // Track our presence
          await presenceChannel.track({
            userId: user.id,
            displayName: profile.displayName,
            initials: profile.initials,
            avatarUrl: profile.avatarUrl,
            isMuted: selfParticipant?.isMuted ?? true,
            hasVideo: selfParticipant?.hasVideo ?? false,
            handRaised: selfParticipant?.handRaised ?? false,
            presenceState: 'active',
            colorSeed: user.id.charCodeAt(0) % 12,
          })
        }
      })

    presenceChannelRef.current = presenceChannel

    return () => {
      channel.unsubscribe()
      presenceChannel.untrack().then(() => presenceChannel.unsubscribe())
      channelRef.current = null
      presenceChannelRef.current = null
    }
  }, [roomId, user?.id])

  /**
   * Broadcast our updated presence state (mute/video/hand).
   */
  const broadcastPresenceUpdate = (updates: {
    isMuted?: boolean
    hasVideo?: boolean
    handRaised?: boolean
    presenceState?: string
  }) => {
    if (!presenceChannelRef.current || !user || !profile) return
    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'participant-state',
      payload: {
        userId: user.id,
        displayName: profile.displayName,
        initials: profile.initials,
        avatarUrl: profile.avatarUrl,
        ...updates,
      },
    })
  }

  /**
   * Broadcast a whiteboard stroke to other participants.
   */
  const broadcastWhiteboardStroke = (stroke: WhiteboardStroke) => {
    if (!channelRef.current) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'whiteboard-stroke',
      payload: stroke,
    })
  }

  return {
    broadcastPresenceUpdate,
    broadcastWhiteboardStroke,
    presenceChannel: presenceChannelRef,
  }
}
