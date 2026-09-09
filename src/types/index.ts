export type Category = 'Tech' | 'Creative' | 'Social' | 'Lifestyle'

export type RoomType = 'text' | 'audio' | 'video'

export type PresenceState = 'active' | 'typing' | 'drawing' | 'thinking' | 'away' | 'speaking'

export interface Topic {
  id: string
  label: string
  category: Category
  type: RoomType
  mindsCount: number
  resonance?: number
  x: number
  y: number
  activity: 'quiet' | 'active' | 'buzzing'
  sampleThoughts: string[]
  minutesRemaining: number
}

// ── Reactions ──────────────────────────────────────────────────────────────
export type ReactionType =
  | 'relate'
  | 'made-me-think'
  | 'tell-me-more'
  | 'different-take'
  | 'inspired'
  | 'made-me-pause'

export interface Reaction {
  type: ReactionType
  count: number
}

export const REACTION_META: Record<ReactionType, { emoji: string; label: string; color: string }> = {
  'relate': { emoji: '⟳', label: 'I relate', color: '#4A7FA5' },
  'made-me-think': { emoji: '◎', label: 'Made me think', color: '#7C4AB5' },
  'tell-me-more': { emoji: '→', label: 'Tell me more', color: '#2E7D5E' },
  'different-take': { emoji: '⟂', label: 'Different take', color: '#A57C42' },
  'inspired': { emoji: '↑', label: 'Inspired', color: '#E8542A' },
  'made-me-pause': { emoji: '‖', label: 'Made me pause', color: '#6E6C7A' },
}

// ── Thoughts ───────────────────────────────────────────────────────────────
export type ThoughtType = 'thought' | 'question' | 'code' | 'link' | 'poll' | 'image'

export type ThoughtRelationship = 'builds-on' | 'relates-to' | 'challenges' | 'extends'

export interface PollOption {
  id: string
  label: string
  votes: number
  myVote?: boolean
}

export interface Thought {
  id: string
  authorId: string
  authorName?: string
  authorInitials?: string
  authorAvatar?: string | null
  type: ThoughtType
  text: string
  code?: string
  language?: string
  url?: string
  pollOptions?: PollOption[]
  imageUrl?: string
  createdAt: number
  reactions: Reaction[]
  myReaction?: ReactionType
  isPriority?: boolean
  parentId?: string
  replies?: Thought[]
}

export interface ThoughtConnection {
  id: string
  fromThoughtId: string
  toThoughtId: string
  relationship: ThoughtRelationship
}

// ── Participants ───────────────────────────────────────────────────────────
export interface Participant {
  id: string
  name: string
  initials: string
  avatarUrl?: string | null
  colorSeed: number
  isSelf?: boolean
  presenceState: PresenceState
  isMuted?: boolean
  hasVideo?: boolean
  handRaised?: boolean
  reactionEmoji?: string
  lastActiveAt?: number
  // WebRTC stream (client-side only, not persisted)
  stream?: MediaStream
}

// ── Whiteboard ─────────────────────────────────────────────────────────────
export type WhiteboardTool = 'pen' | 'marker' | 'eraser' | 'select'

export interface WhiteboardPoint {
  x: number
  y: number
}

export interface WhiteboardStroke {
  id: string
  participantId: string
  tool: WhiteboardTool
  color: string
  width: number
  points: WhiteboardPoint[]
  completed: boolean
}

export interface RemoteCursor {
  participantId: string
  x: number
  y: number
  name: string
  color: string
}

// ── Room ───────────────────────────────────────────────────────────────────
export type RoomStage = 'arrive' | 'share' | 'connect' | 'wrap'

export type RoomTool = 'reactions' | 'thought-graph' | 'whiteboard' | 'priority-questions' | 'file-sharing'

export interface RoomMessage {
  id: string
  authorId: string
  text: string
  timestamp: number
}

export interface Room {
  // DB fields
  id: string
  topicId: string
  topicLabel: string
  type: RoomType
  category: Category
  description?: string
  capacity: number
  visibility: 'public' | 'private' | 'invite'
  tools: RoomTool[]
  // Runtime state
  stage: RoomStage
  startedAt: number
  durationMinutes: number
  participants: Participant[]
  thoughts: Thought[]
  connections: ThoughtConnection[]
  messages: RoomMessage[]
  whiteboard: WhiteboardStroke[]
  // From DB view
  hostName?: string
  hostId?: string
  memberCount?: number
}

// ── Live Room (for discovery list) ─────────────────────────────────────────
export interface LiveRoom {
  id: string
  title: string
  type: RoomType
  category: Category
  description?: string | null
  visibility: 'public' | 'private' | 'invite'
  status: 'active' | 'ended' | 'cancelled'
  capacity: number
  duration_minutes: number
  member_count: number
  host_name?: string
  host_avatar?: string | null
  host_initials?: string
  created_at: string
  expires_at?: string | null
  tools: string[]
}

// ── Daily Signals ──────────────────────────────────────────────────────────
export type SignalReaction = 'resonated' | 'inspired' | 'made-me-pause' | 'different-perspective'

export interface DailySignal {
  id: string
  text: string
  authorId: string
  authorName: string
  authorInitials: string
  authorAvatar?: string | null
  colorSeed: number
  publishedAt: number
  reactions: Record<SignalReaction, number>
  myReaction?: SignalReaction
}

// ── Activity ────────────────────────────────────────────────────────────────
export type ActivityEventType =
  | 'joined-room'
  | 'room-created'
  | 'thought-response'
  | 'connection-created'
  | 'signal-published'
  | 'room-ended'
  | 'moment-saved'
  | 'priority-question'
  | 'audio-room-started'
  | 'video-room-started'
  | 'whiteboard-activity'
  | 'reaction-received'
  | 'participant-joined'
  | 'participant-left'
  | 'thought-posted'

export interface ActivityEvent {
  id: string
  type: ActivityEventType
  timestamp: number
  title: string
  subtitle?: string
  roomLabel?: string
  roomType?: RoomType
  metadata?: Record<string, string | number | boolean>
}

// ── Saved Moment ─────────────────────────────────────────────────────────────
export interface SavedMoment {
  id: string
  topicLabel: string
  roomType: RoomType
  savedAt: number
  mindsGathered: number
  thoughtsShared: number
  connectionsFormed: number
  perspectivesEmerged: number
  highlightThoughts: string[]
}

// ── Wavelength ────────────────────────────────────────────────────────────────
export interface Wavelength {
  text: string
  category: Category
  broadcastAt: number
}

// ── CreateRoom options ────────────────────────────────────────────────────────
export interface CreateRoomOptions {
  title: string
  type: RoomType
  category: Category
  description?: string
  capacity?: number
  durationMinutes?: number
  visibility?: 'public' | 'invite'
  tools?: RoomTool[]
}

// ── Realtime Presence State ───────────────────────────────────────────────────
export interface RoomPresencePayload {
  userId: string
  displayName: string
  initials: string
  avatarUrl: string | null
  isMuted: boolean
  hasVideo: boolean
  handRaised: boolean
  presenceState: PresenceState
}
