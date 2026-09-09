import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare, Mic, Video, Users, Clock, Search, X,
  ArrowRight, Map, List, Filter, Plus, RefreshCw, AlertCircle, Radio
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Category, LiveRoom, RoomType } from '@/types'

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

function timeAgo(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
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

function RoomListCard({ room, onSelect }: { room: LiveRoom; onSelect: () => void }) {
  const Icon = ROOM_TYPE_ICONS[room.type]
  const typeColor = ROOM_TYPE_COLORS[room.type]
  const typeBg = ROOM_TYPE_BG[room.type]
  const catColor = CATEGORY_COLORS[room.category]
  const isFull = room.member_count >= room.capacity

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
              {room.title}
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              {/* Live indicator */}
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: isFull ? 'var(--color-muted)' : 'var(--color-signal)' }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5"
                  style={{ background: isFull ? 'var(--color-muted)' : 'var(--color-signal)' }} />
              </span>
              {room.type === 'audio' && (
                <WaveformMini active={true} />
              )}
            </div>
          </div>

          {room.description && (
            <p className="text-xs line-clamp-1 mb-2" style={{ color: 'var(--color-muted)' }}>
              {room.description}
            </p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-muted)' }}>
              <Users size={10} />
              <span style={{ color: isFull ? 'var(--color-signal)' : 'inherit' }}>
                {room.member_count}/{room.capacity}
              </span>
            </span>
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-muted)' }}>
              <Clock size={10} /> {timeAgo(room.created_at)}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md"
              style={{
                background: `${catColor}15`,
                color: catColor,
              }}>
              {room.category}
            </span>
            <span className="text-[10px] font-mono" style={{ color: typeColor }}>
              {room.type}
            </span>
            {isFull && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                style={{ background: 'var(--color-signal-soft)', color: 'var(--color-signal)' }}>
                Full
              </span>
            )}
          </div>
        </div>

        <ArrowRight size={14} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
          style={{ color: typeColor }} />
      </div>
    </motion.button>
  )
}

function MapNode({ room, onClick }: { room: LiveRoom; onClick: () => void }) {
  const Icon = ROOM_TYPE_ICONS[room.type]
  const typeColor = ROOM_TYPE_COLORS[room.type]
  const typeBg = ROOM_TYPE_BG[room.type]
  // Position nodes pseudo-randomly based on room ID for visual variety
  const hash = room.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const x = 10 + (hash % 80)
  const y = 10 + ((hash * 7) % 80)

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      onClick={onClick}
      className="absolute flex flex-col items-center gap-1.5 -translate-x-1/2 -translate-y-1/2 group z-10"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center border-2 transition-transform group-hover:scale-110 shadow-lg"
        style={{ background: typeBg, borderColor: typeColor }}
      >
        <Icon size={18} style={{ color: typeColor }} strokeWidth={1.5} />
      </div>
      <span className="text-[11px] font-medium whitespace-nowrap px-2 py-0.5 rounded-md bg-surface/90 border border-border"
        style={{ color: 'var(--color-fg)' }}>
        {room.title}
      </span>
    </motion.button>
  )
}

export default function RoomsPage() {
  const navigate = useNavigate()
  const liveRooms = useAppStore((s) => s.liveRooms)
  const liveRoomsLoading = useAppStore((s) => s.liveRoomsLoading)
  const liveRoomsError = useAppStore((s) => s.liveRoomsError)
  const fetchLiveRooms = useAppStore((s) => s.fetchLiveRooms)
  const user = useAppStore((s) => s.user)
  const openAuthModal = useAppStore((s) => s.openAuthModal)

  const [query, setQuery] = useState('')
  const [activeTypes, setActiveTypes] = useState<RoomType[]>([])
  const [activeCategories, setActiveCategories] = useState<Category[]>([])
  const [sort, setSort] = useState<'live' | 'trending' | 'ending-soon'>('live')
  const [view, setView] = useState<'list' | 'map'>('list')
  const [selected, setSelected] = useState<LiveRoom | null>(null)

  const roomTypes: RoomType[] = ['text', 'audio', 'video']
  const categories: Category[] = ['Tech', 'Creative', 'Social', 'Lifestyle']

  // Fetch real rooms on mount and on interval
  useEffect(() => {
    fetchLiveRooms()
    const interval = setInterval(fetchLiveRooms, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const filtered = useMemo(() => {
    let base = liveRooms.filter((r) => {
      const q = query.trim().toLowerCase()
      const matchQ = q === '' || r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)
      const matchType = activeTypes.length === 0 || activeTypes.includes(r.type)
      const matchCat = activeCategories.length === 0 || activeCategories.includes(r.category)
      return matchQ && matchType && matchCat
    })
    if (sort === 'trending') base = [...base].sort((a, b) => b.member_count - a.member_count)
    else if (sort === 'ending-soon') base = [...base].sort((a, b) =>
      new Date(a.expires_at ?? '').getTime() - new Date(b.expires_at ?? '').getTime()
    )
    return base
  }, [liveRooms, query, activeTypes, activeCategories, sort])

  function handleEnter(room: LiveRoom) {
    navigate(`/room/${room.id}?type=${room.type}&title=${encodeURIComponent(room.title)}`)
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
            <div className="flex items-center gap-3">
              <h1 className="font-display text-xl font-semibold" style={{ color: 'var(--color-fg)' }}>
                Live Rooms
              </h1>
              {/* Live indicator */}
              <span className="flex items-center gap-1.5 text-xs font-mono"
                style={{ color: 'var(--color-signal)' }}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-signal)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--color-signal)]" />
                </span>
                {liveRoomsLoading ? '…' : `${liveRooms.length} active`}
              </span>
            </div>
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
                onClick={() => fetchLiveRooms()}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                style={{ color: 'var(--color-muted)' }}
                title="Refresh rooms"
              >
                <RefreshCw size={14} className={liveRoomsLoading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => {
                  if (!user) {
                    openAuthModal('Sign in with Google to create a room.')
                    return
                  }
                  navigate('/create-room')
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--color-signal)', color: 'white' }}
              >
                <Plus size={14} />
                Create
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
            {(['live', 'trending', 'ending-soon'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: sort === s ? 'var(--color-surface-2)' : 'transparent',
                  color: sort === s ? 'var(--color-fg)' : 'var(--color-muted)',
                }}
              >
                {s === 'live' ? 'Live now' : s === 'ending-soon' ? 'Ending soon' : 'Trending'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-6">
        {/* Error state */}
        {liveRoomsError && (
          <div className="flex items-center gap-3 p-4 rounded-xl border mb-4"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <AlertCircle size={16} style={{ color: 'var(--color-signal)' }} />
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              We couldn't reach the wavelength right now. Check your connection.
            </p>
            <button
              onClick={() => fetchLiveRooms()}
              className="ml-auto text-xs font-medium"
              style={{ color: 'var(--color-signal)' }}
            >
              Retry
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Loading skeleton */}
              {liveRoomsLoading && liveRooms.length === 0 ? (
                <div className="text-center py-16">
                  <div className="flex items-center justify-center gap-2 text-sm"
                    style={{ color: 'var(--color-muted)' }}>
                    <Radio size={16} className="animate-pulse" />
                    <span>Finding live wavelengths…</span>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-sm mb-2" style={{ color: 'var(--color-fg)' }}>
                    No active wavelengths yet.
                  </p>
                  <p className="text-xs mb-6" style={{ color: 'var(--color-muted)' }}>
                    Be the first to start one.
                  </p>
                  <button
                    onClick={() => {
                      if (!user) { openAuthModal('Sign in to create a room.'); return }
                      navigate('/create-room')
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: 'var(--color-signal)', color: 'white' }}
                  >
                    Create a room
                  </button>
                </div>
              ) : (
                filtered.map((room) => (
                  <RoomListCard
                    key={room.id}
                    room={room}
                    onSelect={() => setSelected(room)}
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
              {filtered.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No active rooms</p>
                </div>
              ) : (
                filtered.map((room) => (
                  <MapNode
                    key={room.id}
                    room={room}
                    onClick={() => setSelected(room)}
                  />
                ))
              )}
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

                <h2 className="font-display text-2xl font-semibold mb-1"
                  style={{ color: 'var(--color-fg)' }}>
                  {selected.title}
                </h2>

                {selected.description && (
                  <p className="text-sm mb-3" style={{ color: 'var(--color-muted)' }}>
                    {selected.description}
                  </p>
                )}

                <div className="flex items-center gap-5 mb-5">
                  <div>
                    <div className="font-data text-xl font-semibold" style={{ color: 'var(--color-fg)' }}>
                      {selected.member_count}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--color-muted)' }}>minds here</div>
                  </div>
                  <div>
                    <div className="font-data text-xl font-semibold" style={{ color: 'var(--color-fg)' }}>
                      {selected.capacity}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--color-muted)' }}>capacity</div>
                  </div>
                  <div>
                    <div className="font-data text-xl font-semibold" style={{ color: 'var(--color-fg)' }}>
                      {timeAgo(selected.created_at)}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--color-muted)' }}>started</div>
                  </div>
                </div>

                {/* Host info */}
                {selected.host_name && (
                  <div className="flex items-center gap-2 mb-5 text-xs" style={{ color: 'var(--color-muted)' }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: 'var(--color-surface-2)', color: 'var(--color-fg)' }}>
                      {selected.host_initials?.slice(0, 2) ?? '?'}
                    </div>
                    <span>Started by <span style={{ color: 'var(--color-fg)' }}>{selected.host_name}</span></span>
                  </div>
                )}

                <button
                  onClick={() => handleEnter(selected)}
                  disabled={selected.member_count >= selected.capacity}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-all disabled:opacity-50"
                  style={{ background: 'var(--color-signal)', color: 'white' }}
                >
                  {selected.member_count >= selected.capacity ? (
                    'Wavelength is full'
                  ) : (
                    <>
                      Enter this moment
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
