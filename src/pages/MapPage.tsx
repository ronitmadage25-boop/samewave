import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, Radio, MessageSquare, Mic, Video,
  Sparkles, ArrowRight
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Category, Topic, RoomType } from '@/types'

const CATEGORY_PALETTE: Record<Category, { base: string; soft: string }> = {
  Tech: { base: 'var(--color-tech)', soft: 'rgba(46, 125, 94, 0.2)' },
  Creative: { base: 'var(--color-creative)', soft: 'rgba(232, 84, 42, 0.2)' },
  Social: { base: 'var(--color-social)', soft: 'rgba(165, 124, 66, 0.2)' },
  Lifestyle: { base: 'var(--color-lifestyle)', soft: 'rgba(62, 76, 138, 0.2)' },
}

const TYPE_ICONS: Record<RoomType, typeof MessageSquare> = {
  text: MessageSquare,
  audio: Mic,
  video: Video,
}

const TYPE_COLORS: Record<RoomType, string> = {
  text: 'var(--color-text-room)',
  audio: 'var(--color-audio-room)',
  video: 'var(--color-video-room)',
}

// Distance helper for spatial proximity
function distance(t1: Topic, t2: Topic) {
  const dx = t1.x - t2.x
  const dy = t1.y - t2.y
  return Math.sqrt(dx * dx + dy * dy)
}

export default function MapPage() {
  const navigate = useNavigate()
  const topics = useAppStore((s) => s.topics)
  const user = useAppStore((s) => s.user)
  const openAuthModal = useAppStore((s) => s.openAuthModal)
  const enterRoom = useAppStore((s) => s.enterRoom)

  const [selected, setSelected] = useState<Topic | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'resonant' | 'buzzing' | 'voice'>('all')
  const [zoom, setZoom] = useState(1)

  const containerRef = useRef<HTMLDivElement>(null)

  // Filter topics
  const displayedTopics = useMemo(() => {
    return topics.filter((t) => {
      const matchesQuery = !query.trim() || t.label.toLowerCase().includes(query.toLowerCase())
      const matchesCat = !activeCategory || t.category === activeCategory
      let matchesFilter = true
      if (filterType === 'resonant') matchesFilter = (t.resonance ?? 0) >= 45
      if (filterType === 'buzzing') matchesFilter = t.activity === 'buzzing'
      if (filterType === 'voice') matchesFilter = t.type === 'audio' || t.type === 'video'
      return matchesQuery && matchesCat && matchesFilter
    })
  }, [topics, query, activeCategory, filterType])

  // Active target for proximity rays (either hovered or selected)
  const focusedTopic = selected || topics.find((t) => t.id === hoveredId) || null

  // Calculate 3 nearest neighbors to the focused topic
  const nearestNeighbors = useMemo(() => {
    if (!focusedTopic) return []
    return [...topics]
      .filter((t) => t.id !== focusedTopic.id)
      .map((t) => ({ topic: t, dist: distance(focusedTopic, t) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
  }, [focusedTopic, topics])

  // Proximity mesh edges between topics within 0.36 distance
  const proximityEdges = useMemo(() => {
    const edges: { id: string; t1: Topic; t2: Topic; dist: number }[] = []
    for (let i = 0; i < displayedTopics.length; i++) {
      for (let j = i + 1; j < displayedTopics.length; j++) {
        const d = distance(displayedTopics[i], displayedTopics[j])
        if (d < 0.38) {
          edges.push({
            id: `${displayedTopics[i].id}-${displayedTopics[j].id}`,
            t1: displayedTopics[i],
            t2: displayedTopics[j],
            dist: d,
          })
        }
      }
    }
    return edges
  }, [displayedTopics])

  function handleEnter(topicId: string) {
    if (!user) {
      openAuthModal('Sign in with Google to enter this room.')
      return
    }
    enterRoom(topicId)
    navigate('/room')
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)] overflow-hidden select-none">
      {/* Top Floating Control Deck */}
      <header className="px-6 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-md flex items-center justify-between gap-4 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-signal)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--color-signal)]" />
            </span>
            <span className="font-display font-semibold text-sm text-[var(--color-fg)]">
              The Living Social Field
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-[var(--color-border)]">
            <span className="text-[11px] font-mono text-[var(--color-muted)]">
              {displayedTopics.length} mind spaces mapped
            </span>
          </div>
        </div>

        {/* Search & Quick Filters */}
        <div className="flex items-center gap-2 max-w-md w-full justify-end">
          <div className="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 focus-within:border-[var(--color-signal)] transition-colors w-48 sm:w-64">
            <Search size={14} className="text-[var(--color-muted)] shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter field by intent..."
              className="bg-transparent outline-none text-xs text-[var(--color-fg)] placeholder-[var(--color-muted)] w-full"
            />
          </div>

          {/* Preset filters */}
          <div className="hidden sm:flex items-center gap-1 border border-[var(--color-border)] rounded-xl p-0.5 bg-[var(--color-bg)]">
            {[
              { id: 'all' as const, label: 'All' },
              { id: 'resonant' as const, label: 'Resonant' },
              { id: 'buzzing' as const, label: 'Buzzing' },
              { id: 'voice' as const, label: 'Voice/Video' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filterType === f.id
                    ? 'bg-[var(--color-surface-2)] text-[var(--color-signal)] font-semibold shadow-xs'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Interactive Field Canvas */}
      <div className="relative flex-1 overflow-hidden" ref={containerRef}>
        {/* Ambient Radial Waves emanating from user's wavelength resonance center */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[800px] h-[800px] rounded-full border border-[var(--color-signal)]/10 animate-pulse" />
          <div className="absolute w-[540px] h-[540px] rounded-full border border-[var(--color-resonance)]/10" />
          <div className="absolute w-[320px] h-[320px] rounded-full border border-[var(--color-border)]" />
        </div>

        {/* Zoom & Reset Controls */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-1 shadow-lg backdrop-blur-md">
          <button
            onClick={() => setZoom((z) => Math.min(1.5, z + 0.15))}
            className="w-8 h-8 flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-fg)] rounded-lg hover:bg-[var(--color-surface-2)] transition-colors text-sm font-bold"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => setZoom(1)}
            className="w-8 h-8 flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-fg)] rounded-lg hover:bg-[var(--color-surface-2)] transition-colors text-[10px] font-mono"
            title="Reset Zoom"
          >
            1x
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}
            className="w-8 h-8 flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-fg)] rounded-lg hover:bg-[var(--color-surface-2)] transition-colors text-sm font-bold"
            title="Zoom Out"
          >
            −
          </button>
        </div>

        {/* Scalable Field Container */}
        <motion.div
          className="absolute inset-0 origin-center"
          animate={{ scale: zoom }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* SVG Proximity Mesh */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <linearGradient id="proxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--color-signal)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--color-resonance)" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Baseline ambient proximity lines between nearby spaces */}
            {proximityEdges.map((edge) => (
              <line
                key={edge.id}
                x1={`${edge.t1.x * 100}%`}
                y1={`${edge.t1.y * 100}%`}
                x2={`${edge.t2.x * 100}%`}
                y2={`${edge.t2.y * 100}%`}
                stroke="var(--color-border)"
                strokeWidth={1}
                strokeDasharray="4 6"
                opacity={0.35}
              />
            ))}

            {/* Active Proximity Rays from focused topic to its nearest neighbors */}
            {focusedTopic &&
              nearestNeighbors.map(({ topic }) => (
                <line
                  key={`ray-${focusedTopic.id}-${topic.id}`}
                  x1={`${focusedTopic.x * 100}%`}
                  y1={`${focusedTopic.y * 100}%`}
                  x2={`${topic.x * 100}%`}
                  y2={`${topic.y * 100}%`}
                  stroke="url(#proxGrad)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  className="animate-pulse"
                />
              ))}
          </svg>

          {/* Topic Nodes in the Field */}
          {displayedTopics.map((topic) => {
            const isSelected = selected?.id === topic.id
            const isHovered = hoveredId === topic.id
            const isNeighbor = nearestNeighbors.some((n) => n.topic.id === topic.id)
            const Icon = TYPE_ICONS[topic.type]
            const typeCol = TYPE_COLORS[topic.type]
            const catCol = CATEGORY_PALETTE[topic.category].base

            // Dynamic size based on activity and minds count
            const baseSize = 56 + Math.min(28, topic.mindsCount * 1.1)

            return (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                  opacity: 1,
                  scale: isSelected ? 1.2 : isHovered ? 1.15 : isNeighbor ? 1.08 : 1,
                  x: 0,
                  y: 0,
                }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
                style={{
                  left: `${topic.x * 100}%`,
                  top: `${topic.y * 100}%`,
                }}
                onClick={() => setSelected(topic)}
                onMouseEnter={() => setHoveredId(topic.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="relative flex flex-col items-center group">
                  {/* Acoustic Wave Ring if Buzzing or Active */}
                  {topic.activity === 'buzzing' && (
                    <motion.div
                      animate={{ scale: [1, 1.45, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        inset: -12,
                        border: `1.5px solid ${catCol}`,
                      }}
                    />
                  )}

                  {/* Node Circle */}
                  <div
                    className={`rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl backdrop-blur-md relative ${
                      isSelected
                        ? 'ring-4 ring-[var(--color-signal)] ring-offset-2 ring-offset-[var(--color-bg)]'
                        : isNeighbor
                        ? 'ring-2 ring-[var(--color-resonance)]'
                        : 'hover:ring-2 hover:ring-white/40'
                    }`}
                    style={{
                      width: baseSize,
                      height: baseSize,
                      backgroundColor: 'var(--color-surface)',
                      border: `2px solid ${catCol}`,
                    }}
                  >
                    {/* Minds count */}
                    <div className="flex items-center gap-1">
                      <span className="font-display font-bold text-sm text-[var(--color-fg)]">
                        {topic.mindsCount}
                      </span>
                    </div>

                    {/* Room Type badge */}
                    <div
                      className="absolute -bottom-1 p-1 rounded-full shadow-sm text-white"
                      style={{ backgroundColor: typeCol }}
                    >
                      <Icon size={10} />
                    </div>

                    {/* Resonance score chip if calculated */}
                    {topic.resonance !== undefined && (
                      <div className="absolute -top-2 px-1.5 py-0.5 rounded-full bg-[var(--color-resonance)] text-black font-mono text-[9px] font-bold shadow-sm">
                        {topic.resonance}%
                      </div>
                    )}
                  </div>

                  {/* Label below node */}
                  <div className="mt-2 text-center pointer-events-none">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors shadow-sm ${
                        isSelected || isHovered
                          ? 'bg-[var(--color-fg)] text-[var(--color-bg)]'
                          : 'bg-[var(--color-surface)]/80 text-[var(--color-fg)] border border-[var(--color-border)]'
                      }`}
                    >
                      {topic.label}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Bottom Left Legend */}
        <div className="absolute bottom-4 left-6 z-20 flex items-center gap-4 bg-[var(--color-surface)]/85 backdrop-blur-md border border-[var(--color-border)] rounded-xl px-3.5 py-2 text-xs shadow-md">
          <span className="text-[10px] font-mono uppercase text-[var(--color-muted)]">
            Spectrum:
          </span>
          {Object.entries(CATEGORY_PALETTE).map(([cat, val]) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : (cat as Category))}
              className={`flex items-center gap-1.5 text-xs transition-opacity ${
                activeCategory && activeCategory !== cat ? 'opacity-40' : 'opacity-100'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: val.base }} />
              <span className="text-[var(--color-fg)] font-medium">{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Space Preview Drawer */}
      <AnimatePresence>
        {selected && (
          <>
            {/* Backdrop on mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={() => setSelected(null)}
            />

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="fixed bottom-0 right-0 left-0 md:left-auto md:top-16 md:w-[420px] bg-[var(--color-surface)] border-t md:border-l border-[var(--color-border)] shadow-2xl z-50 overflow-y-auto thin-scroll flex flex-col max-h-[85vh] md:max-h-full"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-mono uppercase font-semibold text-white"
                      style={{ backgroundColor: CATEGORY_PALETTE[selected.category].base }}
                    >
                      {selected.category}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-mono uppercase font-semibold text-white"
                      style={{ backgroundColor: TYPE_COLORS[selected.type] }}
                    >
                      {selected.type} room
                    </span>
                  </div>

                  <button
                    onClick={() => setSelected(null)}
                    className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <h2 className="font-display text-2xl font-bold text-[var(--color-fg)] mb-2">
                  {selected.label}
                </h2>

                {/* Spatial Proximity Stat Row */}
                <div className="grid grid-cols-3 gap-3 my-4 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-center">
                  <div>
                    <div className="font-display text-xl font-bold text-[var(--color-fg)]">
                      {selected.mindsCount}
                    </div>
                    <div className="text-[10px] font-mono uppercase text-[var(--color-muted)]">
                      Minds Live
                    </div>
                  </div>
                  <div>
                    <div className="font-display text-xl font-bold text-[var(--color-resonance)]">
                      {selected.resonance ?? 82}%
                    </div>
                    <div className="text-[10px] font-mono uppercase text-[var(--color-muted)]">
                      Resonance
                    </div>
                  </div>
                  <div>
                    <div className="font-display text-xl font-bold text-[var(--color-fg)]">
                      ~{selected.minutesRemaining}m
                    </div>
                    <div className="text-[10px] font-mono uppercase text-[var(--color-muted)]">
                      Remaining
                    </div>
                  </div>
                </div>

                {/* Current Live Thoughts Sparks */}
                <div className="mb-6">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5 mb-2.5">
                    <Sparkles size={12} className="text-[var(--color-signal)]" />
                    Thoughts circulating in this space
                  </span>
                  <div className="space-y-2">
                    {selected.sampleThoughts.map((thought, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-[var(--color-bg)]/80 border border-[var(--color-border)] text-xs text-[var(--color-fg)] leading-relaxed italic"
                      >
                        "{thought}"
                      </div>
                    ))}
                  </div>
                </div>

                {/* Nearest Proximity Spaces */}
                {nearestNeighbors.length > 0 && (
                  <div className="mb-6">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5 mb-2.5">
                      <Radio size={12} className="text-[var(--color-resonance)]" />
                      Adjacent in the social field
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {nearestNeighbors.map(({ topic }) => (
                        <button
                          key={topic.id}
                          onClick={() => setSelected(topic)}
                          className="px-2.5 py-1 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-[var(--color-signal)] text-xs text-[var(--color-fg)] transition-colors"
                        >
                          {topic.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action CTA */}
                <button
                  onClick={() => handleEnter(selected.id)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-sm bg-[var(--color-signal)] text-white hover:opacity-95 transition-opacity shadow-lg"
                >
                  <span>Enter this space now</span>
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
