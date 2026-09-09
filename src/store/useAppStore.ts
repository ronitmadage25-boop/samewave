import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { getProfileFromUser, upsertProfile, type UserProfile } from '@/services/auth'
import * as RoomService from '@/services/rooms'
import * as ThoughtService from '@/services/thoughts'
import type {
  Wavelength, Topic, Room, SavedMoment, Thought,
  ThoughtConnection, ReactionType, ThoughtRelationship, RoomStage,
  DailySignal, ActivityEvent, SignalReaction,
  Participant, PresenceState, WhiteboardStroke, WhiteboardPoint,
  RoomMessage, ThoughtType, PollOption, LiveRoom, RoomType,
} from '@/types'
import { TOPICS } from '@/data/topics'

// ── Helpers ────────────────────────────────────────────────────────────────
function makeReactions() {
  return [
    { type: 'relate' as const, count: 0 },
    { type: 'made-me-think' as const, count: 0 },
    { type: 'tell-me-more' as const, count: 0 },
    { type: 'different-take' as const, count: 0 },
    { type: 'inspired' as const, count: 0 },
    { type: 'made-me-pause' as const, count: 0 },
  ]
}

function mapDbMessageToThought(msg: ThoughtService.DbMessage, currentUserId?: string): Thought {
  const reactionCounts: Record<string, number> = {}
  let myReaction: ReactionType | undefined

  if (msg.reactions) {
    for (const r of msg.reactions) {
      reactionCounts[r.reaction] = (reactionCounts[r.reaction] || 0) + 1
      if (r.user_id === currentUserId) {
        myReaction = r.reaction as ReactionType
      }
    }
  }

  return {
    id: msg.id,
    authorId: msg.author_id,
    authorName: msg.author?.display_name,
    authorInitials: msg.author?.initials,
    authorAvatar: msg.author?.avatar_url,
    type: msg.type,
    text: msg.content,
    code: msg.code ?? undefined,
    language: msg.language ?? undefined,
    url: msg.url ?? undefined,
    pollOptions: msg.poll_options?.map(o => ({ ...o, myVote: false })) ?? undefined,
    createdAt: new Date(msg.created_at).getTime(),
    reactions: [
      { type: 'relate' as const, count: reactionCounts['relate'] ?? 0 },
      { type: 'made-me-think' as const, count: reactionCounts['made-me-think'] ?? 0 },
      { type: 'tell-me-more' as const, count: reactionCounts['tell-me-more'] ?? 0 },
      { type: 'different-take' as const, count: reactionCounts['different-take'] ?? 0 },
      { type: 'inspired' as const, count: reactionCounts['inspired'] ?? 0 },
      { type: 'made-me-pause' as const, count: reactionCounts['made-me-pause'] ?? 0 },
    ],
    myReaction,
    isPriority: msg.is_priority,
    parentId: msg.parent_id ?? undefined,
  }
}

// ── State Interface ────────────────────────────────────────────────────────
interface AppState {
  // Auth & Session
  user: User | null
  session: Session | null
  profile: UserProfile | null
  authLoading: boolean
  authModalOpen: boolean
  authModalReason: string
  openAuthModal: (reason?: string) => void
  closeAuthModal: () => void
  initAuth: () => () => void

  // Core local
  wavelength: Wavelength | null
  topics: Topic[]
  activeRoom: Room | null
  savedMoments: SavedMoment[]
  identityWavelengths: string[]
  activityFeed: ActivityEvent[]

  // Live rooms (from DB)
  liveRooms: LiveRoom[]
  liveRoomsLoading: boolean
  liveRoomsError: string | null

  // Daily signals (from DB)
  dailySignals: DailySignal[]
  myDailySignal: DailySignal | null
  signalsLoading: boolean

  // Room loading state
  roomLoading: boolean
  roomError: string | null

  // ── Intent & Discovery ──────────────────────────────────────────────────
  broadcastIntent: (text: string, category: Wavelength['category']) => void
  getTopResonantTopics: (n?: number) => Topic[]

  // ── Rooms Discovery ───────────────────────────────────────────────────
  fetchLiveRooms: () => Promise<void>

  // ── Room Lifecycle (local UI state) ─────────────────────────────────────
  leaveRoom: () => void
  setRoomStage: (stage: RoomStage) => void
  endRoom: () => void
  saveMoment: () => void
  resetJourney: () => void
  setActiveRoom: (room: Room | null) => void

  // ── Participants (real presence updates) ─────────────────────────────────
  setParticipants: (participants: Participant[]) => void
  addParticipant: (p: Participant) => void
  removeParticipant: (userId: string) => void
  updateParticipant: (userId: string, updates: Partial<Participant>) => void
  toggleMuteSelf: () => void
  toggleVideoSelf: () => void
  raiseHandSelf: () => void
  setParticipantPresence: (participantId: string, state: PresenceState) => void
  setParticipantSpeaking: (participantId: string, speaking: boolean) => void
  setParticipantReactionEmoji: (participantId: string, emoji: string | undefined) => void

  // ── Thoughts (real DB + optimistic) ─────────────────────────────────────
  addThought: (text: string, type?: ThoughtType, extra?: {
    code?: string; language?: string; url?: string;
    pollOptions?: PollOption[]; parentId?: string;
  }) => Promise<void>
  addThoughtFromRealtime: (thought: Thought) => void
  markPriority: (thoughtId: string) => void
  reactToThought: (thoughtId: string, reaction: ReactionType) => Promise<void>
  connectThoughts: (fromId: string, toId: string, relationship: ThoughtRelationship) => Promise<void>
  addConnectionFromRealtime: (connection: ThoughtConnection) => void
  replyToThought: (parentId: string, text: string) => Promise<void>
  votePoll: (thoughtId: string, optionId: string) => void

  // ── Messages ────────────────────────────────────────────────────────────
  sendMessage: (text: string) => void

  // ── Whiteboard (local + broadcast) ──────────────────────────────────────
  addStroke: (stroke: WhiteboardStroke) => void
  addPointToStroke: (strokeId: string, point: WhiteboardPoint) => void
  completeStroke: (strokeId: string) => void
  undoStroke: () => void
  clearWhiteboard: () => void

  // ── Daily Signals (real DB) ──────────────────────────────────────────────
  fetchDailySignals: () => Promise<void>
  publishDailySignal: (text: string) => Promise<{ error: string | null }>
  reactToDailySignal: (signalId: string, reaction: SignalReaction) => Promise<void>

  // ── Activity ─────────────────────────────────────────────────────────────
  addActivityEvent: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void
  fetchActivityEvents: () => Promise<void>
}

// ── Scoring (kept for Intent/Resonance UX flow) ────────────────────────────
function scoreResonance(intentText: string, topic: Topic): number {
  const words = intentText.toLowerCase().split(/\W+/).filter(Boolean)
  const label = topic.label.toLowerCase()
  let score = 30 + Math.round(Math.random() * 15)
  for (const w of words) {
    if (w.length > 2 && label.includes(w)) score += 35
  }
  const techWords = ['react', 'hook', 'code', 'ai', 'llm', 'startup', 'build', 'dev', 'app', 'tool']
  const creativeWords = ['design', 'music', 'art', 'creative', 'write']
  const socialWords = ['talk', 'match', 'game', 'friend', 'people']
  const lifeWords = ['study', 'life', 'habit', 'together']
  const bump = (list: string[], cat: string) =>
    words.some((w) => list.includes(w)) && topic.category === cat ? 20 : 0
  score += bump(techWords, 'Tech')
  score += bump(creativeWords, 'Creative')
  score += bump(socialWords, 'Social')
  score += bump(lifeWords, 'Lifestyle')
  return Math.max(12, Math.min(97, score))
}

// ── Store ──────────────────────────────────────────────────────────────────
export const useAppStore = create<AppState>((set, get) => ({
  // Auth state
  user: null,
  session: null,
  profile: null,
  authLoading: true,
  authModalOpen: false,
  authModalReason: 'Sign in with Google to enter temporary spaces and share your thoughts.',

  openAuthModal: (reason) => {
    set({
      authModalOpen: true,
      authModalReason: reason || 'Sign in with Google to enter temporary spaces and share your thoughts.',
    })
  },
  closeAuthModal: () => set({ authModalOpen: false }),

  initAuth: () => {
    if (!isSupabaseConfigured()) {
      set({ authLoading: false })
      return () => {}
    }

    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const profile = getProfileFromUser(session.user)
        set({ user: session.user, session, profile, authLoading: false })
        // Sync profile to DB
        upsertProfile(session.user).catch(console.error)
      } else {
        set({ user: null, session: null, profile: null, authLoading: false })
      }
    })

    // 2. Auth change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const profile = getProfileFromUser(session.user)
        set({ user: session.user, session, profile, authLoading: false })
        // Sync profile to DB on sign-in
        upsertProfile(session.user).catch(console.error)
      } else {
        set({ user: null, session: null, profile: null, authLoading: false })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  },

  wavelength: null,
  topics: TOPICS,
  activeRoom: null,
  savedMoments: [],
  identityWavelengths: ['Building', 'Learning', 'Exploring'],
  activityFeed: [],
  liveRooms: [],
  liveRoomsLoading: false,
  liveRoomsError: null,
  dailySignals: [],
  myDailySignal: null,
  signalsLoading: false,
  roomLoading: false,
  roomError: null,

  // ── Intent (local scoring — for discovery UX) ───────────────────────────
  broadcastIntent: (text, category) => {
    const topics = get().topics.map((t) => ({ ...t, resonance: scoreResonance(text, t) }))
    set({ wavelength: { text, category, broadcastAt: Date.now() }, topics })
  },

  getTopResonantTopics: (n = 3) =>
    [...get().topics].sort((a, b) => (b.resonance ?? 0) - (a.resonance ?? 0)).slice(0, n),

  // ── Live Rooms (real DB) ────────────────────────────────────────────────
  fetchLiveRooms: async () => {
    set({ liveRoomsLoading: true, liveRoomsError: null })
    const { data, error } = await RoomService.fetchRooms()
    if (error) {
      set({ liveRoomsLoading: false, liveRoomsError: error })
      return
    }
    const liveRooms: LiveRoom[] = data.map(r => ({
      id: r.id,
      title: r.title,
      type: r.type,
      category: r.category,
      description: r.description,
      visibility: r.visibility,
      status: r.status,
      capacity: r.capacity,
      duration_minutes: r.duration_minutes,
      member_count: r.member_count ?? 0,
      host_name: r.host_name,
      host_avatar: r.host_avatar,
      host_initials: r.host_initials,
      created_at: r.created_at,
      expires_at: r.expires_at,
      tools: r.tools,
    }))
    set({ liveRooms, liveRoomsLoading: false })
  },

  // ── Room UI State ────────────────────────────────────────────────────────
  setActiveRoom: (room) => set({ activeRoom: room }),

  leaveRoom: () => {
    set({ activeRoom: null })
  },

  setRoomStage: (stage) => {
    const room = get().activeRoom
    if (!room) return
    set({ activeRoom: { ...room, stage } })
  },

  endRoom: () => {
    const room = get().activeRoom
    if (!room) return
    const user = get().user
    if (user) {
      RoomService.endRoom(room.id, user.id).catch(console.error)
    }
    set({ activeRoom: { ...room, stage: 'wrap' } })
  },

  saveMoment: () => {
    const room = get().activeRoom
    if (!room) return
    const perspectiveCount = new Set(room.connections.map((c) => c.relationship)).size
    const moment: SavedMoment = {
      id: `m-${Date.now()}`,
      topicLabel: room.topicLabel,
      roomType: room.type,
      savedAt: Date.now(),
      mindsGathered: room.participants.length,
      thoughtsShared: room.thoughts.length,
      connectionsFormed: room.connections.length,
      perspectivesEmerged: Math.max(1, perspectiveCount),
      highlightThoughts: room.thoughts.slice(0, 3).map((t) => t.text),
    }
    set((s) => ({ savedMoments: [moment, ...s.savedMoments] }))
    get().addActivityEvent({
      type: 'moment-saved',
      title: 'You saved a moment',
      subtitle: `${room.topicLabel} · ${room.participants.length} minds · ${room.thoughts.length} thoughts`,
      roomLabel: room.topicLabel,
    })
  },

  resetJourney: () => {
    set({ activeRoom: null })
  },

  // ── Participants ──────────────────────────────────────────────────────────
  setParticipants: (participants) => {
    const room = get().activeRoom
    if (!room) return
    set({ activeRoom: { ...room, participants } })
  },

  addParticipant: (p) => {
    const room = get().activeRoom
    if (!room) return
    // Don't add if already present
    if (room.participants.some(existing => existing.id === p.id)) return
    set({ activeRoom: { ...room, participants: [...room.participants, p] } })
  },

  removeParticipant: (userId) => {
    const room = get().activeRoom
    if (!room) return
    set({ activeRoom: { ...room, participants: room.participants.filter(p => p.id !== userId) } })
  },

  updateParticipant: (userId, updates) => {
    const room = get().activeRoom
    if (!room) return
    const participants = room.participants.map(p => p.id === userId ? { ...p, ...updates } : p)
    set({ activeRoom: { ...room, participants } })
  },

  toggleMuteSelf: () => {
    const room = get().activeRoom
    if (!room) return
    const participants = room.participants.map((p) =>
      p.isSelf ? { ...p, isMuted: !p.isMuted } : p
    )
    set({ activeRoom: { ...room, participants } })
  },

  toggleVideoSelf: () => {
    const room = get().activeRoom
    if (!room) return
    const participants = room.participants.map((p) =>
      p.isSelf ? { ...p, hasVideo: !p.hasVideo } : p
    )
    set({ activeRoom: { ...room, participants } })
  },

  raiseHandSelf: () => {
    const room = get().activeRoom
    if (!room) return
    const participants = room.participants.map((p) =>
      p.isSelf ? { ...p, handRaised: !p.handRaised } : p
    )
    set({ activeRoom: { ...room, participants } })
  },

  setParticipantPresence: (participantId, state) => {
    const room = get().activeRoom
    if (!room) return
    const participants = room.participants.map((p) =>
      p.id === participantId ? { ...p, presenceState: state } : p
    )
    set({ activeRoom: { ...room, participants } })
  },

  setParticipantSpeaking: (participantId, speaking) => {
    const room = get().activeRoom
    if (!room) return
    const participants = room.participants.map((p) =>
      p.id === participantId
        ? { ...p, presenceState: speaking ? ('speaking' as PresenceState) : ('active' as PresenceState) }
        : p
    )
    set({ activeRoom: { ...room, participants } })
  },

  setParticipantReactionEmoji: (participantId, emoji) => {
    const room = get().activeRoom
    if (!room) return
    const participants = room.participants.map((p) =>
      p.id === participantId ? { ...p, reactionEmoji: emoji } : p
    )
    set({ activeRoom: { ...room, participants } })
  },

  // ── Thoughts (real DB + optimistic) ──────────────────────────────────────
  addThought: async (text, type = 'thought', extra = {}) => {
    const room = get().activeRoom
    const user = get().user
    const profile = get().profile
    if (!room || !user) return

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const tempThought: Thought = {
      id: tempId,
      authorId: user.id,
      authorName: profile?.displayName,
      authorInitials: profile?.initials,
      authorAvatar: profile?.avatarUrl,
      type,
      text,
      code: extra.code,
      language: extra.language,
      url: extra.url,
      pollOptions: extra.pollOptions,
      createdAt: Date.now(),
      reactions: makeReactions(),
      isPriority: type === 'question',
      parentId: extra.parentId,
    }
    set({ activeRoom: { ...room, thoughts: [...room.thoughts, tempThought] } })

    // Real DB insert
    const { data, error } = await ThoughtService.addThought({
      roomId: room.id,
      authorId: user.id,
      type,
      content: text,
      code: extra.code,
      language: extra.language,
      url: extra.url,
      pollOptions: extra.pollOptions,
      parentId: extra.parentId,
    })

    if (error) {
      console.warn('[store] addThought DB insert notice (kept optimistically):', error)
    }

    // Replace temp with real thought from DB if available
    if (data) {
      const realThought = mapDbMessageToThought(data, user.id)
      const currentRoom = get().activeRoom
      if (currentRoom) {
        set({
          activeRoom: {
            ...currentRoom,
            thoughts: currentRoom.thoughts.map(t => t.id === tempId ? realThought : t),
          },
        })
      }
    }

    // Broadcast thought to other devices via Realtime channel
    const thoughtToBroadcast = data ? mapDbMessageToThought(data, user.id) : tempThought
    try {
      supabase.channel(`room:${room.id}`).send({
        type: 'broadcast',
        event: 'thought-broadcast',
        payload: thoughtToBroadcast,
      })
    } catch {}
  },

  addThoughtFromRealtime: (thought) => {
    const room = get().activeRoom
    if (!room) return
    // Skip if thought already exists (from our own optimistic insert)
    if (room.thoughts.some(t => t.id === thought.id)) return
    set({ activeRoom: { ...room, thoughts: [...room.thoughts, thought] } })
  },

  markPriority: (thoughtId) => {
    const room = get().activeRoom
    if (!room) return
    const thoughts = room.thoughts.map((t) =>
      t.id === thoughtId ? { ...t, isPriority: !t.isPriority } : t
    )
    set({ activeRoom: { ...room, thoughts } })
    ThoughtService.markPriority(thoughtId, !room.thoughts.find(t => t.id === thoughtId)?.isPriority)
      .catch(console.error)
  },

  reactToThought: async (thoughtId, reaction) => {
    const room = get().activeRoom
    const user = get().user
    if (!room || !user) return

    const existing = room.thoughts.find(t => t.id === thoughtId)
    const hadSame = existing?.myReaction === reaction

    // Optimistic update
    const thoughts = room.thoughts.map((t) => {
      if (t.id !== thoughtId) return t
      const reactions = t.reactions.map((r) => {
        if (r.type === reaction) return { ...r, count: r.count + (hadSame ? -1 : 1) }
        if (r.type === t.myReaction) return { ...r, count: Math.max(0, r.count - 1) }
        return r
      })
      return { ...t, reactions, myReaction: hadSame ? undefined : reaction }
    })
    set({ activeRoom: { ...room, thoughts } })

    // Broadcast reaction to other devices
    try {
      supabase.channel(`room:${room.id}`).send({
        type: 'broadcast',
        event: 'reaction-broadcast',
        payload: { messageId: thoughtId, reaction, userId: user.id },
      })
    } catch {}

    // Real DB update
    await ThoughtService.reactToThought(thoughtId, user.id, reaction, existing?.myReaction).catch(() => {})
  },

  connectThoughts: async (fromId, toId, relationship) => {
    const room = get().activeRoom
    const user = get().user
    if (!room || !user) return

    // Check for duplicate
    const exists = room.connections.some(
      (c) => c.fromThoughtId === fromId && c.toThoughtId === toId
    )
    if (exists) return

    // Optimistic
    const tempConnection: ThoughtConnection = {
      id: `temp-c-${Date.now()}`,
      fromThoughtId: fromId,
      toThoughtId: toId,
      relationship,
    }
    set({ activeRoom: { ...room, connections: [...room.connections, tempConnection] } })

    // Broadcast connection to other devices
    try {
      supabase.channel(`room:${room.id}`).send({
        type: 'broadcast',
        event: 'connection-broadcast',
        payload: tempConnection,
      })
    } catch {}

    const { data, error } = await ThoughtService.connectThoughts(room.id, fromId, toId, relationship, user.id)
    if (error) {
      console.warn('[store] connectThoughts DB notice (kept optimistically):', error)
      return
    }

    if (data) {
      const realConnection: ThoughtConnection = {
        id: data.id,
        fromThoughtId: data.from_message_id,
        toThoughtId: data.to_message_id,
        relationship: data.relationship,
      }
      const currentRoom = get().activeRoom
      if (currentRoom) {
        set({
          activeRoom: {
            ...currentRoom,
            connections: currentRoom.connections.map(c => c.id === tempConnection.id ? realConnection : c),
          },
        })
      }
    }
  },

  addConnectionFromRealtime: (connection) => {
    const room = get().activeRoom
    if (!room) return
    if (room.connections.some(c => c.id === connection.id)) return
    set({ activeRoom: { ...room, connections: [...room.connections, connection] } })
  },

  replyToThought: async (parentId, text) => {
    await get().addThought(text, 'thought', { parentId })
  },

  votePoll: (thoughtId, optionId) => {
    const room = get().activeRoom
    const user = get().user
    if (!room || !user) return
    const thoughts = room.thoughts.map((t) => {
      if (t.id !== thoughtId || !t.pollOptions) return t
      const alreadyVoted = t.pollOptions.some((o) => o.myVote)
      const pollOptions = t.pollOptions.map((o) => {
        if (o.id === optionId) {
          return { ...o, votes: o.myVote ? o.votes - 1 : o.votes + 1, myVote: !o.myVote }
        }
        if (alreadyVoted && o.myVote) {
          return { ...o, votes: Math.max(0, o.votes - 1), myVote: false }
        }
        return o
      })
      return { ...t, pollOptions }
    })
    set({ activeRoom: { ...room, thoughts } })
    // Persist to DB
    ThoughtService.votePoll(thoughtId, optionId, user.id).catch(console.error)
  },

  // ── Messages ─────────────────────────────────────────────────────────────
  sendMessage: (text) => {
    const room = get().activeRoom
    if (!room) return
    const msg: RoomMessage = {
      id: `msg-${Date.now()}`,
      authorId: 'self',
      text,
      timestamp: Date.now(),
    }
    set({ activeRoom: { ...room, messages: [...room.messages, msg] } })
  },

  // ── Whiteboard ────────────────────────────────────────────────────────────
  addStroke: (stroke) => {
    const room = get().activeRoom
    if (!room) return
    set({ activeRoom: { ...room, whiteboard: [...room.whiteboard, stroke] } })
  },

  addPointToStroke: (strokeId, point) => {
    const room = get().activeRoom
    if (!room) return
    const whiteboard = room.whiteboard.map((s) =>
      s.id === strokeId ? { ...s, points: [...s.points, point] } : s
    )
    set({ activeRoom: { ...room, whiteboard } })
  },

  completeStroke: (strokeId) => {
    const room = get().activeRoom
    if (!room) return
    const whiteboard = room.whiteboard.map((s) =>
      s.id === strokeId ? { ...s, completed: true } : s
    )
    set({ activeRoom: { ...room, whiteboard } })
  },

  undoStroke: () => {
    const room = get().activeRoom
    const user = get().user
    if (!room) return
    const selfId = user?.id ?? 'self'
    const idx = [...room.whiteboard].reverse().findIndex(
      (s) => s.participantId === selfId && s.completed
    )
    if (idx === -1) return
    const realIdx = room.whiteboard.length - 1 - idx
    const whiteboard = room.whiteboard.filter((_, i) => i !== realIdx)
    set({ activeRoom: { ...room, whiteboard } })
  },

  clearWhiteboard: () => {
    const room = get().activeRoom
    if (!room) return
    set({ activeRoom: { ...room, whiteboard: [] } })
  },

  // ── Daily Signals (real DB) ───────────────────────────────────────────────
  fetchDailySignals: async () => {
    const { fetchTodaysSignals } = await import('@/services/auth')
    set({ signalsLoading: true })
    const { data, error } = await fetchTodaysSignals()
    if (error) {
      console.error('[store] fetchDailySignals error:', error)
      set({ signalsLoading: false })
      return
    }

    const user = get().user
    const signals: DailySignal[] = data.map(s => {
      const reactionMap: Record<string, number> = {}
      let myReaction: SignalReaction | undefined
      for (const r of s.reactions ?? []) {
        reactionMap[r.reaction] = (reactionMap[r.reaction] ?? 0) + 1
        if (r.user_id === user?.id) myReaction = r.reaction as SignalReaction
      }
      return {
        id: s.id,
        text: s.content,
        authorId: s.user_id,
        authorName: s.profile?.display_name ?? 'Wave Rider',
        authorInitials: s.profile?.initials ?? 'WR',
        authorAvatar: s.profile?.avatar_url ?? null,
        colorSeed: s.user_id.charCodeAt(0) % 12,
        publishedAt: new Date(s.created_at).getTime(),
        reactions: {
          resonated: reactionMap['resonated'] ?? 0,
          inspired: reactionMap['inspired'] ?? 0,
          'made-me-pause': reactionMap['made-me-pause'] ?? 0,
          'different-perspective': reactionMap['different-perspective'] ?? 0,
        },
        myReaction,
      }
    })

    const mySignal = user ? signals.find(s => s.authorId === user.id) ?? null : null
    set({ dailySignals: signals, myDailySignal: mySignal, signalsLoading: false })
  },

  publishDailySignal: async (text) => {
    const user = get().user
    if (!user) {
      get().openAuthModal('Sign in to publish your Daily Signal.')
      return { error: 'Not authenticated.' }
    }

    const { publishDailySignal } = await import('@/services/auth')
    const { data, error } = await publishDailySignal(user.id, text)
    if (error || !data) return { error: error ?? 'Failed to publish signal.' }

    const newSignal: DailySignal = {
      id: data.id,
      text: data.content,
      authorId: data.user_id,
      authorName: data.profile?.display_name ?? get().profile?.displayName ?? 'Wave Rider',
      authorInitials: data.profile?.initials ?? get().profile?.initials ?? 'WR',
      authorAvatar: data.profile?.avatar_url ?? get().profile?.avatarUrl ?? null,
      colorSeed: data.user_id.charCodeAt(0) % 12,
      publishedAt: new Date(data.created_at).getTime(),
      reactions: { resonated: 0, inspired: 0, 'made-me-pause': 0, 'different-perspective': 0 },
    }

    set((s) => ({
      myDailySignal: newSignal,
      dailySignals: [newSignal, ...s.dailySignals],
    }))

    return { error: null }
  },

  reactToDailySignal: async (signalId, reaction) => {
    const user = get().user
    if (!user) return

    const existing = get().dailySignals.find(s => s.id === signalId)
    const hadSame = existing?.myReaction === reaction

    // Optimistic update
    set((s) => ({
      dailySignals: s.dailySignals.map((sig) => {
        if (sig.id !== signalId) return sig
        const reactions = { ...sig.reactions }
        if (hadSame) {
          reactions[reaction] = Math.max(0, reactions[reaction] - 1)
          return { ...sig, reactions, myReaction: undefined }
        }
        if (sig.myReaction) reactions[sig.myReaction] = Math.max(0, reactions[sig.myReaction] - 1)
        reactions[reaction] = reactions[reaction] + 1
        return { ...sig, reactions, myReaction: reaction }
      }),
    }))

    const { reactToSignal } = await import('@/services/auth')
    await reactToSignal(signalId, user.id, reaction, existing?.myReaction)
  },

  // ── Activity ──────────────────────────────────────────────────────────────
  addActivityEvent: (event) => {
    const newEvent: ActivityEvent = { ...event, id: `ae-${Date.now()}`, timestamp: Date.now() }
    set((s) => ({ activityFeed: [newEvent, ...s.activityFeed] }))

    // Persist to DB if configured
    const user = get().user
    const room = get().activeRoom
    if (user && isSupabaseConfigured()) {
      supabase.from('activity_events').insert({
        user_id: user.id,
        room_id: room?.id ?? null,
        event_type: event.type as string,
        title: event.title,
        subtitle: event.subtitle ?? null,
        room_label: event.roomLabel ?? null,
        room_type: event.roomType ?? null,
        metadata: event.metadata ?? null,
      }).then(() => {}, console.error)
    }
  },

  fetchActivityEvents: async () => {
    const { data, error } = await supabase
      .from('activity_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[store] fetchActivityEvents error:', error)
      return
    }

    const events: ActivityEvent[] = (data ?? []).map(e => ({
      id: e.id,
      type: e.event_type as ActivityEvent['type'],
      timestamp: new Date(e.created_at).getTime(),
      title: e.title,
      subtitle: e.subtitle ?? undefined,
      roomLabel: e.room_label ?? undefined,
      roomType: e.room_type as RoomType | undefined,
      metadata: e.metadata ?? undefined,
    }))

    set({ activityFeed: events })
  },
}))
