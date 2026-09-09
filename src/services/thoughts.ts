import { supabase } from '@/lib/supabase'
import type { ReactionType, ThoughtRelationship, ThoughtType } from '@/types'

export interface DbMessage {
  id: string
  room_id: string
  author_id: string
  type: ThoughtType
  content: string
  code?: string | null
  language?: string | null
  url?: string | null
  poll_options?: PollOptionDb[] | null
  is_priority: boolean
  parent_id?: string | null
  created_at: string
  updated_at: string
  // Joined
  author?: {
    id: string
    display_name: string
    avatar_url: string | null
    initials: string
  }
  reactions?: DbReaction[]
}

export interface DbReaction {
  id: string
  message_id: string
  user_id: string
  reaction: ReactionType
  created_at: string
}

export interface DbThoughtConnection {
  id: string
  room_id: string
  from_message_id: string
  to_message_id: string
  relationship: ThoughtRelationship
  created_by: string
  created_at: string
}

export interface PollOptionDb {
  id: string
  label: string
  votes: number
}

export interface AddThoughtInput {
  roomId: string
  authorId: string
  type: ThoughtType
  content: string
  code?: string
  language?: string
  url?: string
  pollOptions?: PollOptionDb[]
  parentId?: string
}

/**
 * Fetch all messages for a room with author + reaction counts.
 */
export async function fetchMessages(roomId: string): Promise<{ data: DbMessage[]; error: string | null }> {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      author:profiles(id, display_name, avatar_url, initials),
      reactions(id, message_id, user_id, reaction, created_at)
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[thoughts] fetchMessages error:', error)
    return { data: [], error: error.message }
  }
  return { data: data ?? [], error: null }
}

/**
 * Insert a new message/thought into the DB.
 */
export async function addThought(input: AddThoughtInput): Promise<{ data: DbMessage | null; error: string | null }> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      room_id: input.roomId,
      author_id: input.authorId,
      type: input.type,
      content: input.content,
      code: input.code ?? null,
      language: input.language ?? null,
      url: input.url ?? null,
      poll_options: input.pollOptions ? JSON.parse(JSON.stringify(input.pollOptions)) : null,
      parent_id: input.parentId ?? null,
      is_priority: input.type === 'question',
    })
    .select(`
      *,
      author:profiles(id, display_name, avatar_url, initials)
    `)
    .single()

  if (error) {
    console.error('[thoughts] addThought error:', error)
    return { data: null, error: error.message }
  }
  return { data, error: null }
}

/**
 * React to a thought — upserts (one reaction per user per message).
 * If same reaction is sent again, deletes it (toggle off).
 */
export async function reactToThought(
  messageId: string,
  userId: string,
  reaction: ReactionType,
  existingReaction?: ReactionType
): Promise<{ error: string | null }> {
  // If toggling the same reaction off
  if (existingReaction === reaction) {
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
    return { error: error?.message ?? null }
  }

  // Upsert new reaction
  const { error } = await supabase
    .from('reactions')
    .upsert(
      { message_id: messageId, user_id: userId, reaction },
      { onConflict: 'message_id,user_id' }
    )
  return { error: error?.message ?? null }
}

/**
 * Mark a thought as priority / un-priority.
 */
export async function markPriority(
  messageId: string,
  isPriority: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('messages')
    .update({ is_priority: isPriority })
    .eq('id', messageId)
  return { error: error?.message ?? null }
}

/**
 * Create a thought connection.
 */
export async function connectThoughts(
  roomId: string,
  fromId: string,
  toId: string,
  relationship: ThoughtRelationship,
  userId: string
): Promise<{ data: DbThoughtConnection | null; error: string | null }> {
  const { data, error } = await supabase
    .from('thought_connections')
    .insert({
      room_id: roomId,
      from_message_id: fromId,
      to_message_id: toId,
      relationship,
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    // If duplicate, not a real error — just skip
    if (error.code === '23505') {
      return { data: null, error: null }
    }
    console.error('[thoughts] connectThoughts error:', error)
    return { data: null, error: error.message }
  }
  return { data, error: null }
}

/**
 * Fetch all thought connections for a room.
 */
export async function fetchConnections(roomId: string): Promise<{ data: DbThoughtConnection[]; error: string | null }> {
  const { data, error } = await supabase
    .from('thought_connections')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[thoughts] fetchConnections error:', error)
    return { data: [], error: error.message }
  }
  return { data: data ?? [], error: null }
}

/**
 * Vote on a poll option (updates vote counts in poll_options JSONB).
 */
export async function votePoll(
  messageId: string,
  optionId: string,
  _userId: string
): Promise<{ error: string | null }> {
  // Fetch current poll_options
  const { data: msg } = await supabase
    .from('messages')
    .select('poll_options')
    .eq('id', messageId)
    .single()

  if (!msg?.poll_options) return { error: 'Poll not found.' }

  const opts = msg.poll_options as PollOptionDb[]
  const updated = opts.map((o: PollOptionDb) => ({
    ...o,
    votes: o.id === optionId ? o.votes + 1 : o.votes,
  }))

  const { error } = await supabase
    .from('messages')
    .update({ poll_options: updated })
    .eq('id', messageId)

  return { error: error?.message ?? null }
}
