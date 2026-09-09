import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Radio, Users, Clock, MessageSquare, Mic, Video,
  ArrowRight, Zap, Activity, TrendingUp, Plus, Compass, Sparkles
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Topic, RoomType } from '@/types'

const CATEGORY_COLORS: Record<string, string> = {
  Tech: 'var(--color-tech)',
  Creative: 'var(--color-creative)',
  Social: 'var(--color-social)',
  Lifestyle: 'var(--color-lifestyle)',
}

const ROOM_TYPE_ICONS: Record<RoomType, typeof MessageSquare> = {
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

const ACTIVITY_LABELS = {
  quiet: { label: 'Quiet', color: 'var(--color-muted)' },
  active: { label: 'Active', color: 'var(--color-resonance)' },
  buzzing: { label: 'Buzzing', color: 'var(--color-signal)' },
}

function RoomCard({ topic, onEnter, delay }: { topic: Topic; onEnter: () => void; delay: number }) {
  const Icon = ROOM_TYPE_ICONS[topic.type]
  const typeColor = ROOM_TYPE_COLORS[topic.type]
  const typeBg = ROOM_TYPE_BG[topic.type]
  const activity = ACTIVITY_LABELS[topic.activity]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="group cursor-pointer rounded-2xl border p-5 transition-all hover:border-[var(--color-muted)] hover:shadow-xl relative overflow-hidden flex flex-col justify-between"
      style={{
        background: 'var(--color-surface)',
        borderColor: topic.activity === 'buzzing' ? 'var(--color-signal)' : 'var(--color-border)',
      }}
      onClick={onEnter}
    >
      {/* Top Type & Status */}
      <div>
        <div className="flex items-start justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
              style={{ background: typeBg, border: `1px solid ${typeColor}40` }}
            >
              <Icon size={16} style={{ color: typeColor }} strokeWidth={1.7} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest font-semibold" style={{ color: typeColor }}>
                {topic.type} space
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)]">
            {topic.activity === 'buzzing' && (
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: activity.color }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: activity.color }}
                />
              </span>
            )}
            <span className="text-[10px] font-mono font-medium" style={{ color: activity.color }}>
              {activity.label}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-display text-lg font-bold mb-1.5 leading-snug group-hover:text-[var(--color-signal)] transition-colors text-[var(--color-fg)]">
          {topic.label}
        </h3>

        {/* Sample thought preview */}
        <p className="text-xs leading-relaxed mb-4 line-clamp-2 italic text-[var(--color-muted)]">
          "{topic.sampleThoughts[0]}"
        </p>
      </div>

      {/* Footer info: resonance & minds */}
      <div>
        {topic.resonance !== undefined && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-muted)]">
                Resonance Match
              </span>
              <span className="text-[11px] font-mono font-bold text-[var(--color-resonance)]">
                {topic.resonance}%
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-[var(--color-surface-2)]">
              <motion.div
                className="h-full rounded-full bg-[var(--color-resonance)]"
                initial={{ width: 0 }}
                animate={{ width: `${topic.resonance}%` }}
                transition={{ delay: delay + 0.2, duration: 0.6 }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Users size={12} className="text-[var(--color-muted)]" />
              <span className="text-xs font-mono text-[var(--color-muted)]">
                {topic.mindsCount}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} className="text-[var(--color-muted)]" />
              <span className="text-xs font-mono text-[var(--color-muted)]">
                ~{topic.minutesRemaining}m
              </span>
            </div>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium"
              style={{
                background: `${CATEGORY_COLORS[topic.category]}18`,
                color: CATEGORY_COLORS[topic.category],
              }}
            >
              {topic.category}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs font-medium text-[var(--color-signal)] group-hover:translate-x-1 transition-transform">
            <span>Enter</span>
            <ArrowRight size={13} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const topics = useAppStore((s) => s.topics)
  const wavelength = useAppStore((s) => s.wavelength)
  const dailySignals = useAppStore((s) => s.dailySignals)
  const activityFeed = useAppStore((s) => s.activityFeed)

  const user = useAppStore((s) => s.user)
  const openAuthModal = useAppStore((s) => s.openAuthModal)

  const [activeTab, setActiveTab] = useState<'all' | 'resonant' | 'audio' | 'video'>('all')

  const totalMinds = topics.reduce((acc, t) => acc + t.mindsCount, 0)
  const buzzingRooms = topics.filter((t) => t.activity === 'buzzing')

  const displayedRooms = topics.filter((t) => {
    if (activeTab === 'resonant') return (t.resonance ?? 0) >= 45
    if (activeTab === 'audio') return t.type === 'audio'
    if (activeTab === 'video') return t.type === 'video'
    return true
  })

  function handleEnter(_topicId: string) {
    if (!user) {
      openAuthModal('Sign in with Google to join this room.')
      return
    }
    navigate('/rooms')
  }

  function handleCreateClick() {
    if (!user) {
      openAuthModal('Sign in with Google to create your own temporary space.')
      return
    }
    navigate('/create-room')
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-12 bg-[var(--color-bg)]">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 px-6 lg:px-10 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-md flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--color-fg)]">
            Now on SameWave
          </h1>
          {wavelength ? (
            <p className="text-xs text-[var(--color-muted)] flex items-center gap-1.5 mt-0.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-signal)] animate-pulse" />
              Wavelength: "{wavelength.text.slice(0, 42)}…"
            </p>
          ) : (
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Temporary social spaces formed around current intent
            </p>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/discover')}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--color-border)] hover:bg-[var(--color-surface-2)] text-[var(--color-fg)] transition-all"
          >
            <Compass size={14} className="text-[var(--color-resonance)]" />
            <span>Social Field</span>
          </button>

          <button
            onClick={() => navigate('/intent')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--color-border)] hover:bg-[var(--color-surface-2)] text-[var(--color-fg)] transition-all"
          >
            <Radio size={14} className="text-[var(--color-signal)]" />
            <span>Set Intent</span>
          </button>

          <button
            onClick={handleCreateClick}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--color-signal)] text-white hover:opacity-90 transition-all shadow-md"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Create Space</span>
          </button>
        </div>
      </header>

      <div className="px-6 lg:px-10 py-6 max-w-7xl mx-auto space-y-8">
        {/* Live Social Pulse Ribbon */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-signal)] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-signal)]" />
            </span>
            <div>
              <p className="text-xs font-semibold text-[var(--color-fg)]">
                {totalMinds} minds gathered across {topics.length} temporary spaces
              </p>
              <p className="text-[11px] font-mono text-[var(--color-muted)]">
                Zero permanent feeds. Only real presence and connected thoughts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/discover')}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-signal)] hover:underline"
            >
              <span>Explore Spatial Field</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Buzzing Now Strip */}
        {buzzingRooms.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-[var(--color-signal)]" />
              <h2 className="text-xs font-mono uppercase tracking-widest font-bold text-[var(--color-fg)]">
                Buzzing right now
              </h2>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto thin-scroll pb-2">
              {buzzingRooms.map((topic) => {
                const Icon = ROOM_TYPE_ICONS[topic.type]
                const color = ROOM_TYPE_COLORS[topic.type]

                return (
                  <button
                    key={topic.id}
                    onClick={() => handleEnter(topic.id)}
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-signal)] hover:bg-[var(--color-surface-2)] transition-all shrink-0 shadow-xs group text-left"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      <Icon size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--color-fg)] group-hover:text-[var(--color-signal)] transition-colors truncate max-w-[160px]">
                        {topic.label}
                      </p>
                      <p className="text-[10px] font-mono text-[var(--color-muted)]">
                        {topic.mindsCount} active • {topic.type}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Main Grid Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Spaces Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-[var(--color-signal)]" />
                <h2 className="font-display text-base font-bold text-[var(--color-fg)]">
                  Active Spaces
                </h2>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 border border-[var(--color-border)] rounded-xl p-0.5 bg-[var(--color-surface)]">
                {[
                  { id: 'all' as const, label: 'All' },
                  { id: 'resonant' as const, label: 'Resonant' },
                  { id: 'audio' as const, label: 'Audio' },
                  { id: 'video' as const, label: 'Video' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[var(--color-surface-2)] text-[var(--color-signal)] font-bold shadow-xs'
                        : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displayedRooms.map((topic, i) => (
                <RoomCard
                  key={topic.id}
                  topic={topic}
                  onEnter={() => handleEnter(topic.id)}
                  delay={i * 0.04}
                />
              ))}
            </div>
          </div>

          {/* Right Sidebar: Daily Signals & Activity */}
          <div className="space-y-6">
            {/* Daily Signals */}
            <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-[var(--color-signal)]" />
                  <h3 className="font-semibold text-sm text-[var(--color-fg)]">
                    Daily Signals
                  </h3>
                </div>
                <button
                  onClick={() => navigate('/current')}
                  className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                >
                  Stream →
                </button>
              </div>

              <div className="space-y-3">
                {dailySignals.slice(0, 3).map((signal) => (
                  <div
                    key={signal.id}
                    className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2"
                  >
                    <p className="text-xs leading-relaxed italic text-[var(--color-fg)]">
                      "{signal.text}"
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--color-muted)]">
                      <span>{signal.authorName}</span>
                      <span>
                        {Object.values(signal.reactions).reduce((a, b) => a + b, 0)} reactions
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Flow / Activity Events */}
            <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={15} className="text-[var(--color-muted)]" />
                  <h3 className="font-semibold text-sm text-[var(--color-fg)]">
                    Live Flow
                  </h3>
                </div>
                <button
                  onClick={() => navigate('/current')}
                  className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                >
                  All →
                </button>
              </div>

              <div className="space-y-2.5">
                {activityFeed.slice(0, 4).map((evt) => (
                  <div key={evt.id} className="flex items-start gap-2.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-signal)] mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium text-[var(--color-fg)]">{evt.title}</p>
                      {evt.subtitle && (
                        <p className="text-[11px] text-[var(--color-muted)]">{evt.subtitle}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Create Room Promotion Card */}
            <div
              onClick={handleCreateClick}
              className="p-5 rounded-2xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-signal)] cursor-pointer transition-all bg-[var(--color-surface)]/50 group"
            >
              <div className="flex items-center gap-2 mb-1">
                <Plus size={16} className="text-[var(--color-signal)] group-hover:scale-125 transition-transform" />
                <p className="font-bold text-sm text-[var(--color-fg)]">
                  Form a New Social Space
                </p>
              </div>
              <p className="text-xs text-[var(--color-muted)]">
                Start a Text, Audio, or Video room around an idea you are exploring right now.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
