import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { getProfileFromUser, type UserProfile } from '@/services/auth'
import type {
  Wavelength, Topic, Room, SavedMoment, Thought,
  ThoughtConnection, ReactionType, ThoughtRelationship, RoomStage,
  DailySignal, ActivityEvent, SignalReaction, CreateRoomOptions,
  Participant, PresenceState, WhiteboardStroke, WhiteboardPoint,
  RoomMessage, ThoughtType, PollOption,
} from '@/types'
import { TOPICS } from '@/data/topics'
import { makeParticipants, makeThoughts, makeSeedConnections, getRandomSimulatedThought } from '@/data/room-content'
import { DAILY_SIGNALS } from '@/data/daily-signals'
import { SEED_ACTIVITY } from '@/data/activity'

// ── Scoring ────────────────────────────────────────────────────────────────
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

// ── State Interface ────────────────────────────────────────────────────────
interface AppState {
  // Auth & Session (Google Auth only, no application database)
  user: User | null
  session: Session | null
  profile: UserProfile | null
  authLoading: boolean
  authModalOpen: boolean
  authModalReason: string
  openAuthModal: (reason?: string) => void
  closeAuthModal: () => void
  initAuth: () => () => void

  // Core
  wavelength: Wavelength | null
  topics: Topic[]
  activeRoom: Room | null
  savedMoments: SavedMoment[]
  identityWavelengths: string[]
  dailySignals: DailySignal[]
  myDailySignal: DailySignal | null
  activityFeed: ActivityEvent[]

  // Simulation
  simulationTimer: ReturnType<typeof setInterval> | null
  typingParticipantId: string | null

  // ── Intent & Discovery ──────────────────────────────────────────────────
  broadcastIntent: (text: string, category: Wavelength['category']) => void
  getTopResonantTopics: (n?: number) => Topic[]

  // ── Room Lifecycle ──────────────────────────────────────────────────────
  enterRoom: (topicId: string) => void
  createRoom: (opts: CreateRoomOptions) => void
  leaveRoom: () => void
  setRoomStage: (stage: RoomStage) => void
  endRoom: () => void
  saveMoment: () => void
  resetJourney: () => void

  // ── Thoughts ────────────────────────────────────────────────────────────
  addThought: (text: string, type?: ThoughtType, extra?: {
    code?: string; language?: string; url?: string;
    pollOptions?: PollOption[]; parentId?: string;
  }) => void
  markPriority: (thoughtId: string) => void
  reactToThought: (thoughtId: string, reaction: ReactionType) => void
  connectThoughts: (fromId: string, toId: string, relationship: ThoughtRelationship) => void
  replyToThought: (parentId: string, text: string) => void
  votePoll: (thoughtId: string, optionId: string) => void

  // ── Messages ────────────────────────────────────────────────────────────
  sendMessage: (text: string) => void

  // ── Participants ────────────────────────────────────────────────────────
  toggleMuteSelf: () => void
  toggleVideoSelf: () => void
  raiseHandSelf: () => void
  setParticipantPresence: (participantId: string, state: PresenceState) => void
  setParticipantSpeaking: (participantId: string, speaking: boolean) => void
  setParticipantReactionEmoji: (participantId: string, emoji: string | undefined) => void

  // ── Whiteboard ──────────────────────────────────────────────────────────
  addStroke: (stroke: WhiteboardStroke) => void
  addPointToStroke: (strokeId: string, point: WhiteboardPoint) => void
  completeStroke: (strokeId: string) => void
  undoStroke: () => void
  clearWhiteboard: () => void

  // ── Simulation ──────────────────────────────────────────────────────────
  startSimulation: () => void
  stopSimulation: () => void
  _simulationTick: () => void

  // ── Daily Signals ────────────────────────────────────────────────────────
  publishDailySignal: (text: string) => void
  reactToDailySignal: (signalId: string, reaction: SignalReaction) => void

  // ── Activity ─────────────────────────────────────────────────────────────
  addActivityEvent: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void
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
      } else {
        set({ user: null, session: null, profile: null, authLoading: false })
      }
    })

    // 2. Auth change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const profile = getProfileFromUser(session.user)
        set({ user: session.user, session, profile, authLoading: false })
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
  dailySignals: DAILY_SIGNALS,
  myDailySignal: null,
  activityFeed: SEED_ACTIVITY,
  simulationTimer: null,
  typingParticipantId: null,

  // ── Intent ─────────────────────────────────────────────────────────────
  broadcastIntent: (text, category) => {
    const topics = get().topics.map((t) => ({ ...t, resonance: scoreResonance(text, t) }))
    set({ wavelength: { text, category, broadcastAt: Date.now() }, topics })
  },

  getTopResonantTopics: (n = 3) =>
    [...get().topics].sort((a, b) => (b.resonance ?? 0) - (a.resonance ?? 0)).slice(0, n),

  // ── Room Lifecycle ──────────────────────────────────────────────────────
  enterRoom: (topicId) => {
    const topic = get().topics.find((t) => t.id === topicId)
    if (!topic) return
    const participants = makeParticipants(Math.min(topic.mindsCount, 8))
    const thoughts = makeThoughts(topicId, participants)
    const connections = makeSeedConnections(thoughts)
    const room: Room = {
      topicId,
      topicLabel: topic.label,
      type: topic.type,
      stage: 'arrive',
      startedAt: Date.now(),
      durationMinutes: topic.minutesRemaining,
      participants,
      thoughts,
      connections,
      messages: [],
      whiteboard: [],
      capacity: 50,
      visibility: 'public',
      tools: ['reactions', 'thought-graph', 'priority-questions', 'whiteboard'],
    }
    set({ activeRoom: room })
    get().addActivityEvent({
      type: 'joined-room',
      title: `You joined ${topic.label}`,
      subtitle: `${topic.mindsCount} minds in the room`,
      roomLabel: topic.label,
      roomType: topic.type,
    })
    setTimeout(() => get().startSimulation(), 1500)
  },

  createRoom: (opts) => {
    const participants = makeParticipants(2)
    const room: Room = {
      topicId: `custom-${Date.now()}`,
      topicLabel: opts.title,
      type: opts.type,
      stage: 'arrive',
      startedAt: Date.now(),
      durationMinutes: opts.durationMinutes ?? 45,
      participants,
      thoughts: [],
      connections: [],
      messages: [],
      whiteboard: [],
      capacity: opts.capacity ?? 20,
      visibility: opts.visibility ?? 'public',
      tools: opts.tools ?? ['reactions', 'thought-graph', 'whiteboard'],
      description: opts.description,
    }
    set({ activeRoom: room })
    const evType = opts.type === 'audio' ? 'audio-room-started' as const
      : opts.type === 'video' ? 'video-room-started' as const
      : 'room-created' as const
    get().addActivityEvent({
      type: evType,
      title: `You created "${opts.title}"`,
      subtitle: `${opts.type} room · ${opts.durationMinutes ?? 45}m`,
      roomLabel: opts.title,
      roomType: opts.type,
    })
    setTimeout(() => get().startSimulation(), 2000)
  },

  leaveRoom: () => {
    get().stopSimulation()
    set({ activeRoom: null })
  },

  setRoomStage: (stage) => {
    const room = get().activeRoom
    if (!room) return
    set({ activeRoom: { ...room, stage } })
  },

  endRoom: () => {
    get().stopSimulation()
    const room = get().activeRoom
    if (!room) return
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
    get().stopSimulation()
    set({ activeRoom: null })
  },

  // ── Thoughts ────────────────────────────────────────────────────────────
  addThought: (text, type = 'thought', extra = {}) => {
    const room = get().activeRoom
    if (!room) return
    const thought: Thought = {
      id: `t-self-${Date.now()}`,
      authorId: 'self',
      type,
      text,
      createdAt: Date.now(),
      reactions: makeReactions(),
      isPriority: type === 'question',
      ...extra,
    }
    set({ activeRoom: { ...room, thoughts: [...room.thoughts, thought] } })
    if (type === 'question') {
      get().addActivityEvent({
        type: 'priority-question',
        title: 'You asked a priority question',
        subtitle: `"${text.slice(0, 60)}"`,
        roomLabel: room.topicLabel,
        roomType: room.type,
      })
    }
  },

  markPriority: (thoughtId) => {
    const room = get().activeRoom
    if (!room) return
    const thoughts = room.thoughts.map((t) =>
      t.id === thoughtId ? { ...t, isPriority: !t.isPriority } : t
    )
    set({ activeRoom: { ...room, thoughts } })
  },

  reactToThought: (thoughtId, reaction) => {
    const room = get().activeRoom
    if (!room) return
    const thoughts = room.thoughts.map((t) => {
      if (t.id !== thoughtId) return t
      const hadSame = t.myReaction === reaction
      const reactions = t.reactions.map((r) => {
        if (r.type === reaction) return { ...r, count: r.count + (hadSame ? -1 : 1) }
        if (r.type === t.myReaction) return { ...r, count: Math.max(0, r.count - 1) }
        return r
      })
      return { ...t, reactions, myReaction: hadSame ? undefined : reaction }
    })
    set({ activeRoom: { ...room, thoughts } })
    get().addActivityEvent({
      type: 'reaction-received',
      title: `You reacted to a thought`,
      subtitle: `in ${room.topicLabel}`,
      roomLabel: room.topicLabel,
    })
  },

  connectThoughts: (fromId, toId, relationship) => {
    const room = get().activeRoom
    if (!room) return
    // Check for duplicate
    const exists = room.connections.some(
      (c) => c.fromThoughtId === fromId && c.toThoughtId === toId
    )
    if (exists) return
    const connection: ThoughtConnection = {
      id: `c-${Date.now()}`,
      fromThoughtId: fromId,
      toThoughtId: toId,
      relationship,
    }
    set({ activeRoom: { ...room, connections: [...room.connections, connection] } })
    get().addActivityEvent({
      type: 'connection-created',
      title: 'Thought connection formed',
      subtitle: `"${relationship}" link between 2 ideas`,
      roomLabel: room.topicLabel,
      roomType: room.type,
    })
  },

  replyToThought: (parentId, text) => {
    const room = get().activeRoom
    if (!room) return
    const reply: Thought = {
      id: `t-reply-${Date.now()}`,
      authorId: 'self',
      type: 'thought',
      text,
      createdAt: Date.now(),
      reactions: makeReactions(),
      parentId,
    }
    const thoughts = room.thoughts.map((t) =>
      t.id === parentId ? { ...t, replies: [...(t.replies ?? []), reply] } : t
    )
    set({ activeRoom: { ...room, thoughts } })
  },

  votePoll: (thoughtId, optionId) => {
    const room = get().activeRoom
    if (!room) return
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

  // ── Participants ──────────────────────────────────────────────────────────
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
    if (!room) return
    // Remove the last self stroke
    const idx = [...room.whiteboard].reverse().findIndex(
      (s) => s.participantId === 'self' && s.completed
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
    get().addActivityEvent({
      type: 'whiteboard-activity',
      title: 'Whiteboard cleared',
      subtitle: `in ${room.topicLabel}`,
      roomLabel: room.topicLabel,
    })
  },

  // ── Simulation Engine ─────────────────────────────────────────────────────
  startSimulation: () => {
    const existing = get().simulationTimer
    if (existing) return
    const timer = setInterval(() => get()._simulationTick(), 4000)
    set({ simulationTimer: timer })
  },

  stopSimulation: () => {
    const timer = get().simulationTimer
    if (timer) clearInterval(timer)
    set({ simulationTimer: null, typingParticipantId: null })
  },

  _simulationTick: () => {
    const room = get().activeRoom
    if (!room || room.stage === 'wrap') {
      get().stopSimulation()
      return
    }

    const others = room.participants.filter((p) => !p.isSelf)
    if (others.length === 0) return

    const rand = Math.random()
    const pick = others[Math.floor(Math.random() * others.length)]

    // 35%: simulate speaking (for audio/video rooms)
    if (rand < 0.35 && (room.type === 'audio' || room.type === 'video')) {
      get().setParticipantSpeaking(pick.id, true)
      setTimeout(() => get().setParticipantSpeaking(pick.id, false), 2500 + Math.random() * 2000)
    }
    // 20%: simulate typing → thought
    else if (rand < 0.55 && room.thoughts.length < 14) {
      set({ typingParticipantId: pick.id })
      setTimeout(() => {
        set({ typingParticipantId: null })
        const currentRoom = get().activeRoom
        if (!currentRoom) return
        const thought: Thought = {
          id: `t-sim-${Date.now()}`,
          authorId: pick.id,
          type: 'thought',
          text: getRandomSimulatedThought(),
          createdAt: Date.now(),
          reactions: makeReactions(),
        }
        set({ activeRoom: { ...currentRoom, thoughts: [...currentRoom.thoughts, thought] } })
      }, 2000 + Math.random() * 1500)
    }
    // 15%: simulate reaction on a thought
    else if (rand < 0.70 && room.thoughts.length > 0) {
      const thought = room.thoughts[Math.floor(Math.random() * room.thoughts.length)]
      const types: ReactionType[] = ['relate', 'made-me-think', 'tell-me-more', 'inspired']
      const reactionType = types[Math.floor(Math.random() * types.length)]
      const currentRoom = get().activeRoom
      if (!currentRoom) return
      const thoughts = currentRoom.thoughts.map((t) => {
        if (t.id !== thought.id) return t
        return {
          ...t,
          reactions: t.reactions.map((r) =>
            r.type === reactionType ? { ...r, count: r.count + 1 } : r
          ),
        }
      })
      set({ activeRoom: { ...currentRoom, thoughts } })
    }
    // 10%: simulate emoji reaction floating
    else if (rand < 0.80) {
      const emojis = ['✨', '💡', '🔥', '👏', '🤔', '💯']
      const emoji = emojis[Math.floor(Math.random() * emojis.length)]
      get().setParticipantReactionEmoji(pick.id, emoji)
      setTimeout(() => get().setParticipantReactionEmoji(pick.id, undefined), 1800)
    }
    // 5%: simulated participant joins (if not full)
    else if (rand < 0.85 && room.participants.length < (room.capacity ?? 20)) {
      const newPerson: Participant = {
        id: `p-sim-${Date.now()}`,
        name: ['Karan', 'Simran', 'Rohan', 'Ayesha', 'Rahul'][Math.floor(Math.random() * 5)],
        initials: 'KS',
        colorSeed: Math.floor(Math.random() * 12),
        presenceState: 'active',
        isMuted: false,
        hasVideo: true,
        handRaised: false,
      }
      const currentRoom = get().activeRoom
      if (!currentRoom) return
      set({ activeRoom: { ...currentRoom, participants: [...currentRoom.participants, newPerson] } })
      get().addActivityEvent({
        type: 'participant-joined',
        title: `${newPerson.name} joined the room`,
        subtitle: currentRoom.topicLabel,
        roomLabel: currentRoom.topicLabel,
      })
    }
  },

  // ── Daily Signals ─────────────────────────────────────────────────────────
  publishDailySignal: (text) => {
    const signal: DailySignal = {
      id: `ds-self-${Date.now()}`,
      text,
      authorId: 'self',
      authorName: 'You',
      authorInitials: 'YOU',
      colorSeed: 99,
      publishedAt: Date.now(),
      reactions: { resonated: 0, inspired: 0, 'made-me-pause': 0, 'different-perspective': 0 },
    }
    set((s) => ({
      myDailySignal: signal,
      dailySignals: [signal, ...s.dailySignals],
    }))
    get().addActivityEvent({
      type: 'signal-published',
      title: 'You published a Daily Signal',
      subtitle: `"${text.slice(0, 60)}${text.length > 60 ? '…' : ''}"`,
    })
  },

  reactToDailySignal: (signalId, reaction) => {
    set((s) => ({
      dailySignals: s.dailySignals.map((sig) => {
        if (sig.id !== signalId) return sig
        const hadSame = sig.myReaction === reaction
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
  },

  // ── Activity ──────────────────────────────────────────────────────────────
  addActivityEvent: (event) => {
    const newEvent: ActivityEvent = { ...event, id: `ae-${Date.now()}`, timestamp: Date.now() }
    set((s) => ({ activityFeed: [newEvent, ...s.activityFeed] }))
  },
}))
