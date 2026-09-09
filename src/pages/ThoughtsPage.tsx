import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Mic, Video, ArrowRight, Zap, TrendingUp, HelpCircle, Filter } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Category, RoomType } from '@/types'

const CATEGORY_COLORS: Record<Category, string> = {
  Tech: 'var(--color-tech)',
  Creative: 'var(--color-creative)',
  Social: 'var(--color-social)',
  Lifestyle: 'var(--color-lifestyle)',
}

const ROOM_TYPE_ICONS = { text: MessageSquare, audio: Mic, video: Video }
const ROOM_TYPE_COLORS = {
  text: 'var(--color-text-room)',
  audio: 'var(--color-audio-room)',
  video: 'var(--color-video-room)',
}

const PRIORITY_QUESTIONS = [
  { id: 'pq-1', text: 'How are you handling hallucinations in production AI apps?', votes: 14, roomLabel: 'AI & LLMs', roomType: 'text' as RoomType },
  { id: 'pq-2', text: 'What\'s the best way to structure custom hooks that share state?', votes: 9, roomLabel: 'React Hooks', roomType: 'text' as RoomType },
  { id: 'pq-3', text: 'How do you maintain design consistency across a fast-moving team?', votes: 7, roomLabel: 'Design', roomType: 'video' as RoomType },
  { id: 'pq-4', text: 'At what point does optimizing for performance become premature?', votes: 11, roomLabel: 'Startups', roomType: 'audio' as RoomType },
]

export default function ThoughtsPage() {
  const navigate = useNavigate()
  const topics = useAppStore((s) => s.topics)
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)
  const [activeType, setActiveType] = useState<RoomType | null>(null)
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())

  const categories: Category[] = ['Tech', 'Creative', 'Social', 'Lifestyle']
  const roomTypes: RoomType[] = ['text', 'audio', 'video']

  const allThoughts = topics
    .filter(t => !activeCategory || t.category === activeCategory)
    .filter(t => !activeType || t.type === activeType)
    .flatMap(t => t.sampleThoughts.map((text, i) => ({
      id: `${t.id}-${i}`,
      text,
      topicId: t.id,
      topicLabel: t.label,
      topicType: t.type,
      category: t.category,
      reactions: Math.floor(Math.random() * 12) + 1,
    })))

  function handleJoinRoom(_topicId: string) {
    navigate('/rooms')
  }

  function toggleVote(id: string) {
    setVotedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-8" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 lg:px-8 py-4 border-b"
        style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(16px)', borderColor: 'var(--color-border)' }}>
        <h1 className="font-display text-xl font-semibold mb-3" style={{ color: 'var(--color-fg)' }}>
          Thoughts
        </h1>
        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto thin-scroll pb-1">
          <Filter size={13} style={{ color: 'var(--color-muted)' }} className="shrink-0" />
          {roomTypes.map(t => {
            const Icon = ROOM_TYPE_ICONS[t]
            const color = ROOM_TYPE_COLORS[t]
            return (
              <button key={t}
                onClick={() => setActiveType(activeType === t ? null : t)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 border transition-all"
                style={{
                  background: activeType === t ? `${color}20` : 'transparent',
                  borderColor: activeType === t ? color : 'var(--color-border)',
                  color: activeType === t ? color : 'var(--color-muted)',
                }}>
                <Icon size={11} /> {t}
              </button>
            )
          })}
          <div className="w-px h-4 shrink-0" style={{ background: 'var(--color-border)' }} />
          {categories.map(c => (
            <button key={c}
              onClick={() => setActiveCategory(activeCategory === c ? null : c)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 border transition-all"
              style={{
                background: activeCategory === c ? `${CATEGORY_COLORS[c]}20` : 'transparent',
                borderColor: activeCategory === c ? CATEGORY_COLORS[c] : 'var(--color-border)',
                color: activeCategory === c ? CATEGORY_COLORS[c] : 'var(--color-muted)',
              }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 lg:px-8 py-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Thoughts stream */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 mb-5">
              <Zap size={15} style={{ color: 'var(--color-signal)' }} />
              <h2 className="font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>
                Live thoughts
              </h2>
              <span className="font-data text-xs px-1.5 py-0.5 rounded-md"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-muted)' }}>
                {allThoughts.length}
              </span>
            </div>

            <AnimatePresence>
              <div className="space-y-3">
                {allThoughts.map((thought, i) => {
                  const Icon = ROOM_TYPE_ICONS[thought.topicType]
                  const typeColor = ROOM_TYPE_COLORS[thought.topicType]
                  return (
                    <motion.div
                      key={thought.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="p-5 rounded-xl border group"
                      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                    >
                      <p className="font-display text-base leading-snug mb-4"
                        style={{ color: 'var(--color-fg)' }}>
                        "{thought.text}"
                      </p>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => handleJoinRoom(thought.topicId)}
                          className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
                        >
                          <Icon size={11} style={{ color: typeColor }} />
                          <span className="text-[11px] font-medium" style={{ color: 'var(--color-muted)' }}>
                            {thought.topicLabel}
                          </span>
                          <ArrowRight size={10} style={{ color: 'var(--color-muted)' }} />
                        </button>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
                            {thought.reactions} reactions
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              background: `${CATEGORY_COLORS[thought.category]}15`,
                              color: CATEGORY_COLORS[thought.category],
                            }}>
                            {thought.category}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </AnimatePresence>
          </div>

          {/* Priority Questions sidebar */}
          <div className="lg:col-span-2">
            <div className="sticky top-40">
              <div className="flex items-center gap-2 mb-5">
                <HelpCircle size={15} style={{ color: 'var(--color-audio-room)' }} />
                <h2 className="font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>
                  Priority Questions
                </h2>
              </div>
              <p className="text-xs mb-5" style={{ color: 'var(--color-muted)' }}>
                Upvoted questions seeking answers across all active rooms.
              </p>
              <div className="space-y-3">
                {PRIORITY_QUESTIONS.map((pq) => {
                  const voted = votedIds.has(pq.id)
                  const Icon = ROOM_TYPE_ICONS[pq.roomType]
                  const typeColor = ROOM_TYPE_COLORS[pq.roomType]
                  const votes = pq.votes + (voted ? 1 : 0)
                  return (
                    <motion.div
                      key={pq.id}
                      layout
                      className="p-4 rounded-xl border"
                      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                    >
                      <p className="text-sm leading-snug mb-3" style={{ color: 'var(--color-fg)' }}>
                        {pq.text}
                      </p>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => handleJoinRoom(topics.find(t => t.label === pq.roomLabel)?.id ?? '')}
                          className="flex items-center gap-1 text-[11px] transition-opacity hover:opacity-70"
                        >
                          <Icon size={10} style={{ color: typeColor }} />
                          <span style={{ color: 'var(--color-muted)' }}>{pq.roomLabel}</span>
                        </button>
                        <button
                          onClick={() => toggleVote(pq.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-xs font-medium"
                          style={{
                            background: voted ? 'var(--color-signal-soft)' : 'transparent',
                            borderColor: voted ? 'var(--color-signal)' : 'var(--color-border)',
                            color: voted ? 'var(--color-signal)' : 'var(--color-muted)',
                          }}
                        >
                          <TrendingUp size={11} />
                          {votes}
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
