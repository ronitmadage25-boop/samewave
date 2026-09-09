import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare, Mic, Video, Users, Clock, Search, X,
  ArrowRight, Map, List, Filter
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Category, Topic, RoomType } from '@/types'

const CATEGORY_COLORS: Record<Category, string> = {
  Tech: 'var(--color-tech)',
  Creative: 'var(--color-creative)',
  Social: 'var(--color-social)',
  Lifestyle: 'var(--color-lifestyle)',
}

const ROOM_TYPE_ICONS = {
  text: MessageSquare,
  audio: Mic,
  video: Video,
}

const ROOM_TYPE_COLORS = {
  text: 'var(--color-text-room)',
  audio: 'var(--color-audio-room)',
  video: 'var(--color-video-room)',
}

const ROOM_TYPE_BG = {
  text: 'var(--color-text-room-soft)',
  audio: 'var(--color-audio-room-soft)',
  video: 'var(--color-video-room-soft)',
}

const ACTIVITY_PULSE_COLOR = {
  quiet: 'var(--color-muted)',
  active: 'var(--color-resonance)',
  buzzing: 'var(--color-signal)',
}

function WaveformMini({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[2px] h-4" aria-hidden="true">
      {[4, 8, 6, 10, 7, 5, 9, 6].map((h, i) => (
        <div
          key={i}
          className={active ? 'animate-wave-bar' : ''}
          style={{
            width: 2,
            height: `${h}px`,
            background: 'var(--color-audio-room)',
            borderRadius: 1,
            opacity: active ? 0.8 : 0.3,
            '--duration': `${0.8 + i * 0.1}s`,
            '--delay': `${i * 0.1}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

function RoomListCard({ topic, onSelect }: { topic: Topic; onSelect: () => void }) {
  const Icon = ROOM_TYPE_ICONS[topic.type]
  const typeColor = ROOM_TYPE_COLORS[topic.type]
  const typeBg = ROOM_TYPE_BG[topic.type]
  const actColor = ACTIVITY_PULSE_COLOR[topic.activity]

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onSelect}
      className="w-full text-left rounded-xl border p-4 group transition-all"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-start gap-4">
        {/* Type icon */}
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: typeBg, border: `1px solid ${typeColor}30` }}>
          <Icon size={18} style={{ color: typeColor }} strokeWidth={1.5} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--color-fg)' }}>
              {topic.label}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {topic.activity !== 'quiet' && (
                <span className="relative flex h-1.5 w-1.5">
                  {topic.activity === 'buzzing' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ background: actColor }} />
                  )}
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5"
                    style={{ background: actColor }} />
                </span>
              )}
              {topic.type === 'audio' && (
                <WaveformMini active={topic.activity === 'buzzing'} />
              )}
            </div>
          </div>
          <p className="text-xs line-clamp-1 mb-2" style={{ color: 'var(--color-muted)' }}>
            "{topic.sampleThoughts[0]}"
          </p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-muted)' }}>
              <Users size={10} /> {topic.mindsCount}
            </span>
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-muted)' }}>
              <Clock size={10} /> ~{topic.minutesRemaining}m
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md"
              style={{
                background: `${CATEGORY_COLORS[topic.category]}15`,
                color: CATEGORY_COLORS[topic.category],
              }}>
              {topic.category}
            </span>
            <span className="text-[10px] font-mono"
              style={{ color: typeColor }}>
              {topic.type}
            </span>
          </div>
        </div>

        <ArrowRight size={14} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
          style={{ color: typeColor }} />
      </div>
    </motion.button>
  )
}

function MapNode({ topic, onClick }: { topic: Topic; onClick: () => void }) {
  const Icon = ROOM_TYPE_ICONS[topic.type]
  const typeColor = ROOM_TYPE_COLORS[topic.type]
  const typeBg = ROOM_TYPE_BG[topic.type]

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      onClick={onClick}
      className="absolute flex flex-col items-center gap-1.5 -translate-x-1/2 -translate-y-1/2 group z-10"
      style={{ left: `${topic.x * 100}%`, top: `${topic.y * 100}%` }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center border-2 transition-transform group-hover:scale-110 shadow-lg"
        style={{
          background: typeBg,
          borderColor: typeColor,
        }}
      >
        <Icon size={18} style={{ color: typeColor }} strokeWidth={1.5} />
      </div>
      <span className="text-[11px] font-medium whitespace-nowrap px-2 py-0.5 rounded-md bg-surface/90 border border-border"
        style={{ color: 'var(--color-fg)' }}>
        {topic.label}
      </span>
    </motion.button>
  )
}

export default function RoomsPage() {
  const navigate = useNavigate()
  const topics = useAppStore((s) => s.topics)
  const enterRoom = useAppStore((s) => s.enterRoom)
  const user = useAppStore((s) => s.user)
  const openAuthModal = useAppStore((s) => s.openAuthModal)

  const [query, setQuery] = useState('')
  const [activeTypes, setActiveTypes] = useState<RoomType[]>([])
  const [activeCategories, setActiveCategories] = useState<Category[]>([])
  const [sort, setSort] = useState<'live' | 'trending' | 'for-you' | 'ending-soon'>('live')
  const [view, setView] = useState<'list' | 'map'>('list')
  const [selected, setSelected] = useState<Topic | null>(null)

  const roomTypes: RoomType[] = ['text', 'audio', 'video']
  const categories: Category[] = ['Tech', 'Creative', 'Social', 'Lifestyle']

  const filtered = useMemo(() => {
    let base = topics.filter((t) => {
      const q = query.trim().toLowerCase()
      const matchQ = q === '' || t.label.toLowerCase().includes(q)
      const matchType = activeTypes.length === 0 || activeTypes.includes(t.type)
      const matchCat = activeCategories.length === 0 || activeCategories.includes(t.category)
      return matchQ && matchType && matchCat
    })
    if (sort === 'trending') base = [...base].sort((a, b) => b.mindsCount - a.mindsCount)
    else if (sort === 'ending-soon') base = [...base].sort((a, b) => a.minutesRemaining - b.minutesRemaining)
    else if (sort === 'for-you') {
      base = [...base].filter((t) => t.resonance !== undefined && t.resonance > 40)
      if (base.length === 0) base = topics
    }
    return base
  }, [topics, query, activeTypes, activeCategories, sort])

  function handleEnter(topicId: string) {
    if (!user) {
      openAuthModal('Sign in with Google to join this room.')
      return
    }
    enterRoom(topicId)
    navigate('/room')
  }

  function toggleType(t: RoomType) {
    setActiveTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  function toggleCategory(c: Category) {
    setActiveCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-8" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b"
        style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(16px)', borderColor: 'var(--color-border)' }}>
        <div className="px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display text-xl font-semibold" style={{ color: 'var(--color-fg)' }}>
              Live Rooms
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('list')}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                style={{
                  background: view === 'list' ? 'var(--color-surface-2)' : 'transparent',
                  color: view === 'list' ? 'var(--color-fg)' : 'var(--color-muted)',
                }}
              >
                <List size={15} />
              </button>
              <button
                onClick={() => setView('map')}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                style={{
                  background: view === 'map' ? 'var(--color-surface-2)' : 'transparent',
                  color: view === 'map' ? 'var(--color-fg)' : 'var(--color-muted)',
                }}
              >
                <Map size={15} />
              </button>
              <button
                onClick={() => navigate('/create-room')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--color-signal)', color: 'white' }}
              >
                + Create
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2 mb-3"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <Search size={14} style={{ color: 'var(--color-muted)' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search rooms…"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--color-fg)' }}
            />
            {query && (
              <button onClick={() => setQuery('')}>
                <X size={13} style={{ color: 'var(--color-muted)' }} />
              </button>
            )}
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-2 overflow-x-auto thin-scroll pb-1">
            <Filter size={13} style={{ color: 'var(--color-muted)' }} className="shrink-0" />
            {/* Room type filters */}
            {roomTypes.map((t) => {
              const Icon = ROOM_TYPE_ICONS[t]
              const color = ROOM_TYPE_COLORS[t]
              const active = activeTypes.includes(t)
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all border"
                  style={{
                    background: active ? `${color}20` : 'transparent',
                    borderColor: active ? color : 'var(--color-border)',
                    color: active ? color : 'var(--color-muted)',
                  }}
                >
                  <Icon size={12} />
                  {t}
                </button>
              )
            })}
            <div className="w-px h-4 shrink-0" style={{ background: 'var(--color-border)' }} />
            {/* Category filters */}
            {categories.map((c) => {
              const active = activeCategories.includes(c)
              const color = CATEGORY_COLORS[c]
              return (
                <button
                  key={c}
                  onClick={() => toggleCategory(c)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all border"
                  style={{
                    background: active ? `${color}20` : 'transparent',
                    borderColor: active ? color : 'var(--color-border)',
                    color: active ? color : 'var(--color-muted)',
                  }}
                >
                  {c}
                </button>
              )
            })}
          </div>

          {/* Sort tabs */}
          <div className="flex items-center gap-1 mt-3">
            {(['live', 'trending', 'for-you', 'ending-soon'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: sort === s ? 'var(--color-surface-2)' : 'transparent',
                  color: sort === s ? 'var(--color-fg)' : 'var(--color-muted)',
                }}
              >
                {s === 'live' ? 'Live now' : s === 'for-you' ? 'For you' : s === 'ending-soon' ? 'Ending soon' : 'Trending'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {view === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No rooms match your filters.</p>
                </div>
              ) : (
                filtered.map((topic) => (
                  <RoomListCard
                    key={topic.id}
                    topic={topic}
                    onSelect={() => setSelected(topic)}
                  />
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full dot-grid rounded-2xl border overflow-hidden"
              style={{
                height: '65vh',
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              {filtered.map((topic) => (
                <MapNode
                  key={topic.id}
                  topic={topic}
                  onClick={() => setSelected(topic)}
                />
              ))}
              {/* Legend */}
              <div className="absolute bottom-4 left-4 flex flex-wrap gap-3 px-3 py-2 rounded-xl border"
                style={{ background: 'rgba(18,18,26,0.9)', borderColor: 'var(--color-border)' }}>
                {(['text', 'audio', 'video'] as RoomType[]).map((t) => {
                  const Icon = ROOM_TYPE_ICONS[t]
                  return (
                    <div key={t} className="flex items-center gap-1.5 text-[11px]">
                      <Icon size={11} style={{ color: ROOM_TYPE_COLORS[t] }} />
                      <span style={{ color: 'var(--color-muted)' }}>{t}</span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Room preview panel */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 md:left-auto md:right-6 md:bottom-6 md:w-[420px] z-50 rounded-t-3xl md:rounded-3xl border overflow-hidden"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="p-6">
                {/* Type badge */}
                {(() => {
                  const Icon = ROOM_TYPE_ICONS[selected.type]
                  const typeColor = ROOM_TYPE_COLORS[selected.type]
                  const typeBg = ROOM_TYPE_BG[selected.type]
                  return (
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                        style={{ background: typeBg, border: `1px solid ${typeColor}30` }}>
                        <Icon size={14} style={{ color: typeColor }} />
                        <span className="text-xs font-medium capitalize" style={{ color: typeColor }}>
                          {selected.type} room
                        </span>
                      </div>
                      <button onClick={() => setSelected(null)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg"
                        style={{ background: 'var(--color-surface-2)', color: 'var(--color-muted)' }}>
                        <X size={14} />
                      </button>
                    </div>
                  )
                })()}

                <h2 className="font-display text-2xl font-semibold mb-2"
                  style={{ color: 'var(--color-fg)' }}>
                  {selected.label}
                </h2>

                <div className="flex items-center gap-5 mb-5">
                  <div>
                    <div className="font-data text-xl font-semibold" style={{ color: 'var(--color-fg)' }}>
                      {selected.mindsCount}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--color-muted)' }}>minds here</div>
                  </div>
                  {selected.resonance !== undefined && (
                    <div>
                      <div className="font-data text-xl font-semibold" style={{ color: 'var(--color-resonance)' }}>
                        {selected.resonance}%
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--color-muted)' }}>resonance</div>
                    </div>
                  )}
                  <div>
                    <div className="font-data text-xl font-semibold" style={{ color: 'var(--color-fg)' }}>
                      ~{selected.minutesRemaining}m
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--color-muted)' }}>remaining</div>
                  </div>
                </div>

                <p className="text-xs font-mono uppercase tracking-widest mb-3"
                  style={{ color: 'var(--color-muted)' }}>
                  Live thoughts
                </p>
                <div className="space-y-2 mb-6">
                  {selected.sampleThoughts.map((t, i) => (
                    <p key={i} className="text-sm pl-3 py-1.5 border-l-2"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-fg)' }}>
                      "{t}"
                    </p>
                  ))}
                </div>

                <button
                  onClick={() => handleEnter(selected.id)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-all"
                  style={{ background: 'var(--color-signal)', color: 'white' }}
                >
                  Enter this moment
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
