import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DoorOpen, Zap, Network, Radio, Bookmark, HelpCircle,
  MessageSquare, Mic, Video, Activity, Send, Check, Sparkles, PlusCircle, UserPlus, UserMinus
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { ActivityEvent, ActivityEventType, SignalReaction } from '@/types'

const EVENT_ICONS: Record<ActivityEventType, typeof Activity> = {
  'joined-room': DoorOpen,
  'room-created': PlusCircle,
  'thought-response': MessageSquare,
  'connection-created': Network,
  'signal-published': Zap,
  'room-ended': Radio,
  'moment-saved': Bookmark,
  'priority-question': HelpCircle,
  'audio-room-started': Mic,
  'video-room-started': Video,
  'whiteboard-activity': Activity,
  'reaction-received': Sparkles,
  'participant-joined': UserPlus,
  'participant-left': UserMinus,
}

const EVENT_COLORS: Record<ActivityEventType, string> = {
  'joined-room': 'var(--color-resonance)',
  'room-created': 'var(--color-signal)',
  'thought-response': 'var(--color-text-room)',
  'connection-created': 'var(--color-audio-room)',
  'signal-published': 'var(--color-signal)',
  'room-ended': 'var(--color-muted)',
  'moment-saved': 'var(--color-signal)',
  'priority-question': 'var(--color-audio-room)',
  'audio-room-started': 'var(--color-audio-room)',
  'video-room-started': 'var(--color-video-room)',
  'whiteboard-activity': 'var(--color-resonance)',
  'reaction-received': 'var(--color-signal)',
  'participant-joined': 'var(--color-resonance)',
  'participant-left': 'var(--color-muted)',
}

const SIGNAL_REACTIONS: { id: SignalReaction; label: string }[] = [
  { id: 'resonated', label: 'Resonated' },
  { id: 'inspired', label: 'Inspired' },
  { id: 'made-me-pause', label: 'Made me pause' },
  { id: 'different-perspective', label: 'Different perspective' },
]

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function ActivityItem({ event, index }: { event: ActivityEvent; index: number }) {
  const Icon = EVENT_ICONS[event.type] ?? Activity
  const color = EVENT_COLORS[event.type] ?? 'var(--color-muted)'

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex gap-4 group"
    >
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon size={14} style={{ color }} strokeWidth={1.5} />
        </div>
        <div className="w-px flex-1 mt-1" style={{ background: 'var(--color-border)' }} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-5 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-medium leading-snug" style={{ color: 'var(--color-fg)' }}>
            {event.title}
          </p>
          <span className="text-[11px] shrink-0 font-mono" style={{ color: 'var(--color-muted)' }}>
            {formatRelativeTime(event.timestamp)}
          </span>
        </div>
        {event.subtitle && (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            {event.subtitle}
          </p>
        )}
        {event.roomLabel && (
          <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-mono"
            style={{ color }}>
            {event.roomType === 'audio' && <Mic size={9} />}
            {event.roomType === 'video' && <Video size={9} />}
            {event.roomType === 'text' && <MessageSquare size={9} />}
            {event.roomLabel}
          </span>
        )}
      </div>
    </motion.div>
  )
}

export default function CurrentPage() {
  const activityFeed = useAppStore((s) => s.activityFeed)
  const dailySignals = useAppStore((s) => s.dailySignals)
  const myDailySignal = useAppStore((s) => s.myDailySignal)
  const publishDailySignal = useAppStore((s) => s.publishDailySignal)
  const reactToDailySignal = useAppStore((s) => s.reactToDailySignal)
  const user = useAppStore((s) => s.user)
  const openAuthModal = useAppStore((s) => s.openAuthModal)
  const [signalDraft, setSignalDraft] = useState('')
  const [signalPublished, setSignalPublished] = useState(false)
  const MAX_SIGNAL = 120

  function handlePublish() {
    if (!user) {
      openAuthModal('Sign in with Google to broadcast your daily signal.')
      return
    }
    if (signalDraft.trim().length < 4) return
    publishDailySignal(signalDraft.trim())
    setSignalPublished(true)
    setSignalDraft('')
  }

  function handleReaction(signalId: string, id: SignalReaction) {
    if (!user) {
      openAuthModal('Sign in with Google to resonate with signals.')
      return
    }
    reactToDailySignal(signalId, id)
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-8" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 lg:px-8 py-4 border-b"
        style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(16px)', borderColor: 'var(--color-border)' }}>
        <h1 className="font-display text-xl font-semibold" style={{ color: 'var(--color-fg)' }}>
          The Current
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
          Your live social activity stream
        </p>
      </div>

      <div className="px-6 lg:px-8 py-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Activity timeline — main */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 mb-6">
              <Activity size={15} style={{ color: 'var(--color-signal)' }} />
              <h2 className="font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>
                Activity
              </h2>
              <span className="font-data text-xs px-1.5 py-0.5 rounded-md"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-muted)' }}>
                {activityFeed.length}
              </span>
            </div>
            <div>
              {activityFeed.map((event, i) => (
                <ActivityItem key={event.id} event={event} index={i} />
              ))}
            </div>
          </div>

          {/* Sidebar: Daily Signals + composer */}
          <div className="lg:col-span-2">
            <div className="sticky top-28 space-y-6">
              {/* Daily Signal composer */}
              <div className="rounded-2xl border p-5"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={14} style={{ color: 'var(--color-signal)' }} />
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>
                    Daily Signal
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                    style={{ background: 'var(--color-signal-soft)', color: 'var(--color-signal)' }}>
                    Once/day
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  {myDailySignal || signalPublished ? (
                    <motion.div
                      key="published"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-4"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
                        style={{ background: 'var(--color-signal-soft)' }}>
                        <Check size={18} style={{ color: 'var(--color-signal)' }} />
                      </div>
                      <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-fg)' }}>
                        Signal sent
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                        Your thought is out in the world
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div key="composer" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
                        One small thought for today. Make it count.
                      </p>
                      <textarea
                        value={signalDraft}
                        onChange={e => setSignalDraft(e.target.value.slice(0, MAX_SIGNAL))}
                        placeholder="Share something you're thinking about today…"
                        rows={3}
                        className="w-full bg-transparent text-sm leading-relaxed placeholder:opacity-30 outline-none border rounded-xl px-3 py-2.5 resize-none transition-colors mb-2"
                        style={{
                          color: 'var(--color-fg)',
                          borderColor: signalDraft.length > 0 ? 'var(--color-signal)' : 'var(--color-border)',
                          background: 'var(--color-surface-2)',
                        }}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono" style={{ color: 'var(--color-muted)' }}>
                          {signalDraft.length}/{MAX_SIGNAL}
                        </span>
                        <button
                          onClick={handlePublish}
                          disabled={signalDraft.trim().length < 4}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                          style={{ background: 'var(--color-signal)', color: 'white' }}
                        >
                          <Send size={11} />
                          Publish signal
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Today's signals */}
              <div>
                <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--color-fg)' }}>
                  Today's signals
                </h3>
                <div className="space-y-4">
                  {dailySignals.slice(0, 4).map((signal) => (
                    <div key={signal.id} className="p-4 rounded-xl border"
                      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                      <p className="font-display text-sm leading-snug mb-3"
                        style={{ color: 'var(--color-fg)' }}>
                        "{signal.text}"
                      </p>
                      <div className="flex items-center gap-1.5 mb-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{ background: 'var(--color-signal)', color: 'white' }}>
                          {signal.authorName[0]}
                        </div>
                        <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
                          {signal.authorName}
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
                          · {formatRelativeTime(signal.publishedAt)}
                        </span>
                      </div>
                      {/* Reactions */}
                      <div className="flex flex-wrap gap-1.5">
                        {SIGNAL_REACTIONS.map(({ id, label }) => {
                          const count = signal.reactions[id] + (signal.myReaction === id ? 0 : 0)
                          const active = signal.myReaction === id
                          return (
                            <button
                              key={id}
                              onClick={() => handleReaction(signal.id, id)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all"
                              style={{
                                background: active ? 'var(--color-signal-soft)' : 'transparent',
                                borderColor: active ? 'var(--color-signal)' : 'var(--color-border)',
                                color: active ? 'var(--color-signal)' : 'var(--color-muted)',
                              }}
                            >
                              {label}
                              {count > 0 && <span className="font-data font-semibold">{count}</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
