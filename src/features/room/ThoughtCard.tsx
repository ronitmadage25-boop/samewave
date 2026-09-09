import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, MessageSquare, Star, BarChart3, ExternalLink, Code2, ChevronDown, ChevronUp } from 'lucide-react'
import type { Thought, Participant, ReactionType } from '@/types'
import { avatarColor } from '@/components/ui/AvatarCluster'
import { ReactionBar } from './ReactionBar'
import { useAppStore } from '@/store/useAppStore'

const TYPE_ICONS = {
  thought: MessageSquare,
  question: Star,
  code: Code2,
  link: ExternalLink,
  poll: BarChart3,
  image: MessageSquare,
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  return (
    <div className="rounded-xl overflow-hidden border mt-2"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b"
        style={{ borderColor: 'var(--color-border)' }}>
        <span className="text-[10px] font-mono uppercase tracking-widest"
          style={{ color: 'var(--color-muted)' }}>
          {language ?? 'code'}
        </span>
      </div>
      <pre className="px-4 py-3 text-xs font-mono overflow-x-auto thin-scroll"
        style={{ color: 'var(--color-fg)' }}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

function PollBlock({
  options,
  thoughtId,
}: {
  options: NonNullable<Thought['pollOptions']>
  thoughtId: string
}) {
  const votePoll = useAppStore((s) => s.votePoll)
  const total = options.reduce((a, o) => a + o.votes, 0)
  return (
    <div className="mt-3 space-y-2">
      {options.map((o) => {
        const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0
        return (
          <button
            key={o.id}
            onClick={() => votePoll(thoughtId, o.id)}
            className="w-full text-left rounded-xl border overflow-hidden relative transition-all"
            style={{
              borderColor: o.myVote ? 'var(--color-signal)' : 'var(--color-border)',
              background: 'var(--color-surface-2)',
            }}
          >
            <motion.div
              className="absolute inset-y-0 left-0 rounded-l-xl"
              style={{ background: o.myVote ? 'var(--color-signal-soft)' : 'var(--color-surface-3)' }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4 }}
            />
            <div className="relative flex items-center justify-between px-3 py-2.5">
              <span className="text-sm" style={{ color: o.myVote ? 'var(--color-signal)' : 'var(--color-fg)' }}>
                {o.label}
              </span>
              <span className="text-[11px] font-data"
                style={{ color: 'var(--color-muted)' }}>
                {pct}%
              </span>
            </div>
          </button>
        )
      })}
      <p className="text-[10px] font-mono" style={{ color: 'var(--color-muted)' }}>
        {total} votes
      </p>
    </div>
  )
}

export function ThoughtCard({
  thought,
  author,
  onReact,
  onConnect,
  connectMode,
  isConnectSource,
  selectable,
}: {
  thought: Thought
  author?: Participant
  onReact: (type: ReactionType) => void
  onConnect?: () => void
  connectMode?: boolean
  isConnectSource?: boolean
  selectable?: boolean
}) {
  const replyToThought = useAppStore((s) => s.replyToThought)
  const markPriority = useAppStore((s) => s.markPriority)
  const [showReplies, setShowReplies] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')
  const [replyOpen, setReplyOpen] = useState(false)

  const color = author ? avatarColor(author.colorSeed) : '#555'
  const Icon = TYPE_ICONS[thought.type] ?? MessageSquare
  const replyCount = thought.replies?.length ?? 0

  function handleReply() {
    if (replyDraft.trim().length < 2) return
    replyToThought(thought.id, replyDraft.trim())
    setReplyDraft('')
    setReplyOpen(false)
    setShowReplies(true)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={[
        'rounded-2xl border p-4 md:p-5 transition-all',
        thought.isPriority ? 'border-l-4' : '',
        isConnectSource ? 'ring-2' : '',
        selectable ? 'cursor-pointer hover:opacity-80' : '',
      ].join(' ')}
      style={{
        background: thought.isPriority ? 'var(--color-surface-2)' : 'var(--color-surface)',
        borderColor: isConnectSource
          ? 'var(--color-signal)'
          : thought.isPriority
          ? 'var(--color-signal)'
          : 'var(--color-border)',
        borderLeftColor: thought.isPriority ? 'var(--color-signal)' : undefined,
        boxShadow: isConnectSource ? '0 0 0 2px var(--color-signal)' : undefined,
      }}
      onClick={selectable ? onConnect : undefined}
    >
      {/* Priority badge */}
      {thought.isPriority && (
        <div className="flex items-center gap-1.5 mb-3">
          <Star size={12} style={{ color: 'var(--color-signal)' }} fill="var(--color-signal)" />
          <span className="text-[10px] font-mono uppercase tracking-widest"
            style={{ color: 'var(--color-signal)' }}>
            Priority question
          </span>
        </div>
      )}

      {/* Author row */}
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
          style={{ background: color }}
        >
          {author?.initials.slice(0, 2) ?? '??'}
        </div>
        <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
          {author?.isSelf ? 'You' : (author?.name ?? 'Someone')}
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <Icon size={11} style={{ color: 'var(--color-muted)' }} />
          <span className="text-[10px] font-mono" style={{ color: 'var(--color-muted)' }}>
            {timeAgo(thought.createdAt)}
          </span>
        </div>
      </div>

      {/* Content */}
      <p className="text-[15px] leading-relaxed mb-3 font-display"
        style={{ color: 'var(--color-fg)' }}>
        {thought.text}
      </p>

      {/* Code block */}
      {thought.code && <CodeBlock code={thought.code} language={thought.language} />}

      {/* Link */}
      {thought.url && (
        <a
          href={thought.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 mt-2 text-xs px-3 py-2 rounded-lg border"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-surface-2)',
            color: 'var(--color-text-room)',
          }}
        >
          <ExternalLink size={11} />
          {thought.url}
        </a>
      )}

      {/* Poll */}
      {thought.pollOptions && (
        <PollBlock options={thought.pollOptions} thoughtId={thought.id} />
      )}

      {/* Reactions + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap mt-4 pt-3 border-t"
        style={{ borderColor: 'var(--color-border)' }}>
        <ReactionBar
          reactions={thought.reactions}
          myReaction={thought.myReaction}
          onReact={onReact}
          compact
        />
        <div className="flex items-center gap-2">
          {/* Reply */}
          <button
            onClick={(e) => { e.stopPropagation(); setReplyOpen(!replyOpen) }}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-all"
            style={{
              borderColor: 'var(--color-border)',
              color: replyOpen ? 'var(--color-fg)' : 'var(--color-muted)',
            }}
          >
            <MessageSquare size={11} />
            {replyCount > 0 ? replyCount : 'Reply'}
          </button>
          {/* Connect */}
          {onConnect && !connectMode && (
            <button
              onClick={(e) => { e.stopPropagation(); onConnect() }}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-all"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
            >
              <Link2 size={11} />
              Connect
            </button>
          )}
          {/* Priority toggle (self thoughts only) */}
          {author?.isSelf && (
            <button
              onClick={(e) => { e.stopPropagation(); markPriority(thought.id) }}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-all"
              style={{
                borderColor: thought.isPriority ? 'var(--color-signal)' : 'var(--color-border)',
                color: thought.isPriority ? 'var(--color-signal)' : 'var(--color-muted)',
              }}
            >
              <Star size={11} fill={thought.isPriority ? 'var(--color-signal)' : 'none'} />
              Priority
            </button>
          )}
        </div>
      </div>

      {/* Reply composer */}
      <AnimatePresence>
        {replyOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <div className="flex items-center gap-2 mt-1">
              <input
                autoFocus
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                placeholder="Your reply…"
                className="flex-1 bg-transparent outline-none text-sm rounded-xl border px-3 py-2"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-fg)',
                  background: 'var(--color-surface-2)',
                }}
              />
              <button
                onClick={handleReply}
                disabled={replyDraft.trim().length < 2}
                className="px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-40 transition-all"
                style={{ background: 'var(--color-signal)', color: 'white' }}
              >
                Reply
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Replies */}
      {replyCount > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-[11px] transition-colors"
            style={{ color: 'var(--color-muted)' }}
          >
            {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </button>
          <AnimatePresence>
            {showReplies && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 pl-4 border-l space-y-2 overflow-hidden"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {thought.replies?.map((reply) => (
                  <div key={reply.id} className="py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ background: 'var(--color-signal)' }}>
                        YOU
                      </div>
                      <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>You</span>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--color-muted)' }}>
                        {timeAgo(reply.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--color-fg)' }}>{reply.text}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
