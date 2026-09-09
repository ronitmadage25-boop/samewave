import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Zap, RefreshCw, AlertCircle, Radio, Clock, PenLine } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { SignalReaction } from '@/types'
import { supabase } from '@/lib/supabase'

const SIGNAL_REACTIONS: { id: SignalReaction; label: string; emoji: string }[] = [
  { id: 'resonated', label: 'Resonated', emoji: '⟳' },
  { id: 'inspired', label: 'Inspired', emoji: '↑' },
  { id: 'made-me-pause', label: 'Made me pause', emoji: '‖' },
  { id: 'different-perspective', label: 'Different take', emoji: '⟂' },
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

function getInitialColor(seed: number): string {
  const COLORS = [
    '#E8542A', '#4A7FA5', '#7C4AB5', '#2E7D5E',
    '#E5A93C', '#E24A8D', '#1E88E5', '#43A047',
    '#FB8C00', '#8E24AA', '#00ACC1', '#D81B60',
  ]
  return COLORS[seed % COLORS.length]
}

export default function ThoughtsPage() {
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const dailySignals = useAppStore((s) => s.dailySignals)
  const signalsLoading = useAppStore((s) => s.signalsLoading)
  const fetchDailySignals = useAppStore((s) => s.fetchDailySignals)
  const reactToDailySignal = useAppStore((s) => s.reactToDailySignal)
  const openAuthModal = useAppStore((s) => s.openAuthModal)

  const load = useCallback(() => {
    fetchDailySignals()
  }, [fetchDailySignals])

  useEffect(() => {
    load()
  }, [load])

  // Realtime subscription for new thoughts
  useEffect(() => {
    const channel = supabase
      .channel('daily-signals-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'daily_signals' },
        () => {
          // Refresh when any new signal is inserted
          fetchDailySignals()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchDailySignals])

  function handleReaction(signalId: string, reaction: SignalReaction) {
    if (!user) {
      openAuthModal('Sign in with Google to react to thoughts.')
      return
    }
    reactToDailySignal(signalId, reaction)
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-8" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 lg:px-8 py-4 border-b"
        style={{ background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(16px)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold" style={{ color: 'var(--color-fg)' }}>
              Thoughts
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
              One thought per person, per day — renewed every 24 hours
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ color: 'var(--color-muted)' }}
            >
              <RefreshCw size={14} className={signalsLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => navigate('/current')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold"
              style={{ background: 'var(--color-signal)', color: 'white' }}
            >
              <PenLine size={13} />
              Post thought
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-6 max-w-2xl mx-auto">
        {/* Loading skeleton */}
        {signalsLoading && dailySignals.length === 0 && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border p-5 animate-pulse"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', minHeight: 130 }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!signalsLoading && dailySignals.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <Radio size={28} style={{ color: 'var(--color-muted)' }} strokeWidth={1.5} />
            </div>
            <p className="text-base font-semibold mb-2" style={{ color: 'var(--color-fg)' }}>
              No active thoughts yet.
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
              Be the first to share what's on your mind today.
            </p>
            {user ? (
              <button
                onClick={() => navigate('/current')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--color-signal)', color: 'white' }}
              >
                <PenLine size={15} />
                Post today's thought
              </button>
            ) : (
              <button
                onClick={() => openAuthModal('Sign in to share your thought.')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--color-signal)', color: 'white' }}
              >
                Sign in to post
              </button>
            )}
          </div>
        )}

        {/* Thoughts feed */}
        <AnimatePresence>
          <div className="space-y-4">
            {dailySignals.map((signal, i) => {
              const color = getInitialColor(signal.colorSeed)
              const totalReactions = Object.values(signal.reactions).reduce((a, b) => a + b, 0)
              return (
                <motion.div
                  key={signal.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-2xl border p-5"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                >
                  {/* Author */}
                  <div className="flex items-center gap-3 mb-4">
                    {signal.authorAvatar ? (
                      <img
                        src={signal.authorAvatar}
                        alt={signal.authorName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                        style={{ background: color }}>
                        {signal.authorInitials.slice(0, 2)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-fg)' }}>
                        {signal.authorName}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--color-muted)' }}>
                        <Clock size={10} />
                        <span>{formatRelativeTime(signal.publishedAt)}</span>
                        {totalReactions > 0 && (
                          <>
                            <span>·</span>
                            <Zap size={10} style={{ color: 'var(--color-signal)' }} />
                            <span>{totalReactions} reactions</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Thought text */}
                  <p className="font-display text-base leading-relaxed mb-5"
                    style={{ color: 'var(--color-fg)' }}>
                    "{signal.text}"
                  </p>

                  {/* Reaction buttons */}
                  <div className="flex flex-wrap gap-2">
                    {SIGNAL_REACTIONS.map(({ id, label, emoji }) => {
                      const count = signal.reactions[id]
                      const active = signal.myReaction === id
                      return (
                        <button
                          key={id}
                          onClick={() => handleReaction(signal.id, id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all"
                          style={{
                            background: active ? 'var(--color-signal-soft)' : 'transparent',
                            borderColor: active ? 'var(--color-signal)' : 'var(--color-border)',
                            color: active ? 'var(--color-signal)' : 'var(--color-muted)',
                          }}
                        >
                          <span>{emoji}</span>
                          <span>{label}</span>
                          {count > 0 && (
                            <span className="font-data font-bold">{count}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </AnimatePresence>

        {/* Not authenticated notice */}
        {!user && dailySignals.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 p-4 rounded-xl border flex items-center gap-3"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <AlertCircle size={16} style={{ color: 'var(--color-signal)' }} />
            <p className="text-sm flex-1" style={{ color: 'var(--color-muted)' }}>
              Sign in to react and share your own thought today.
            </p>
            <button
              onClick={() => openAuthModal('Sign in to participate in Thoughts.')}
              className="text-xs font-semibold shrink-0"
              style={{ color: 'var(--color-signal)' }}
            >
              Sign in →
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
