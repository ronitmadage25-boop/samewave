import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Zap, Send, Check, ArrowLeft, AlertCircle, Clock } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { hasPublishedTodaySignal, publishDailySignal as publishSignalDB } from '@/services/auth'

const MAX_CHARS = 240

export default function CurrentPage() {
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const profile = useAppStore((s) => s.profile)
  const openAuthModal = useAppStore((s) => s.openAuthModal)
  const fetchDailySignals = useAppStore((s) => s.fetchDailySignals)

  const [draft, setDraft] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [alreadyPosted, setAlreadyPosted] = useState(false)
  const [publishedText, setPublishedText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)

  // Check if user has already posted today
  useEffect(() => {
    async function checkStatus() {
      if (!user) return
      setCheckingStatus(true)
      const hasPosted = await hasPublishedTodaySignal(user.id)
      if (hasPosted) setAlreadyPosted(true)
      setCheckingStatus(false)
    }
    checkStatus()
  }, [user])

  async function handlePublish() {
    if (!user) {
      openAuthModal('Sign in with Google to publish your daily thought.')
      return
    }
    if (draft.trim().length < 4) return
    if (alreadyPosted) return

    setPublishing(true)
    setError(null)

    const { error: err } = await publishSignalDB(user.id, draft.trim())

    if (err) {
      if (err.includes('already published')) {
        setAlreadyPosted(true)
      } else {
        setError(err)
      }
    } else {
      setPublishedText(draft.trim())
      setPublished(true)
      setDraft('')
      // Refresh thoughts list
      fetchDailySignals()
    }

    setPublishing(false)
  }

  const charsLeft = MAX_CHARS - draft.length
  const tooShort = draft.trim().length < 4
  const overLimit = draft.length > MAX_CHARS

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <Zap size={24} style={{ color: 'var(--color-signal)' }} strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-2xl font-bold mb-3" style={{ color: 'var(--color-fg)' }}>
            Today's Thought
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
            Sign in to share one thought with the SameWave community today.
          </p>
          <button
            onClick={() => openAuthModal('Sign in to post your daily thought.')}
            className="px-6 py-3 rounded-xl font-semibold text-sm"
            style={{ background: 'var(--color-signal)', color: 'white' }}
          >
            Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-sm font-mono" style={{ color: 'var(--color-muted)' }}>
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-8" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 lg:px-8 py-4 border-b"
        style={{ background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(16px)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ color: 'var(--color-muted)' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="font-display text-xl font-semibold" style={{ color: 'var(--color-fg)' }}>
              Today's Thought
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
              One thought per day — visible to everyone for 24 hours
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8 max-w-xl mx-auto">

        <AnimatePresence mode="wait">
          {/* Already posted state */}
          {alreadyPosted && !published ? (
            <motion.div
              key="already-posted"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'var(--color-signal-soft)' }}>
                <Check size={24} style={{ color: 'var(--color-signal)' }} />
              </div>
              <h2 className="font-display text-xl font-semibold mb-3" style={{ color: 'var(--color-fg)' }}>
                You've already posted today.
              </h2>
              <p className="text-sm mb-2" style={{ color: 'var(--color-muted)' }}>
                Your thought is out in the world. Come back tomorrow to share another.
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-4 mb-6 text-xs font-mono"
                style={{ color: 'var(--color-muted)' }}>
                <Clock size={12} />
                Resets at midnight your local time
              </div>
              <button
                onClick={() => navigate('/thoughts')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--color-signal)', color: 'white' }}
              >
                View all thoughts
              </button>
            </motion.div>
          ) : published ? (
            /* Success state */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'var(--color-signal-soft)' }}>
                <Check size={24} style={{ color: 'var(--color-signal)' }} />
              </div>
              <h2 className="font-display text-xl font-semibold mb-3" style={{ color: 'var(--color-fg)' }}>
                Thought published!
              </h2>
              <div className="p-5 rounded-2xl border mb-6 text-left"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <p className="font-display text-base leading-relaxed" style={{ color: 'var(--color-fg)' }}>
                  "{publishedText}"
                </p>
                <p className="text-xs mt-3 font-mono" style={{ color: 'var(--color-muted)' }}>
                  — {profile?.displayName ?? 'You'} · just now · expires in 24h
                </p>
              </div>
              <button
                onClick={() => navigate('/thoughts')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--color-signal)', color: 'white' }}
              >
                See it in Thoughts →
              </button>
            </motion.div>
          ) : (
            /* Composer */
            <motion.div
              key="composer"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Context */}
              <div className="flex items-center gap-3 mb-6">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.displayName}
                    className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: 'var(--color-signal)' }}>
                    {profile?.initials ?? '??'}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-fg)' }}>
                    {profile?.displayName}
                  </p>
                  <p className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                    Posting today's thought
                  </p>
                </div>
              </div>

              {/* Textarea */}
              <div className="rounded-2xl border overflow-hidden mb-4"
                style={{
                  borderColor: draft.length > 0 ? 'var(--color-signal)' : 'var(--color-border)',
                  background: 'var(--color-surface)',
                }}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, MAX_CHARS + 10))}
                  placeholder="Write something meaningful. What's on your mind today?"
                  rows={5}
                  className="w-full px-5 py-4 text-sm leading-relaxed bg-transparent outline-none resize-none placeholder:opacity-30"
                  style={{ color: 'var(--color-fg)' }}
                  autoFocus
                />
                <div className="px-5 py-3 border-t flex items-center justify-between"
                  style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-xs font-mono"
                    style={{ color: overLimit ? '#EF4444' : 'var(--color-muted)' }}>
                    {charsLeft} chars left
                  </span>
                  <button
                    onClick={handlePublish}
                    disabled={tooShort || overLimit || publishing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                    style={{ background: 'var(--color-signal)', color: 'white' }}
                  >
                    {publishing ? (
                      <span className="font-mono">Publishing…</span>
                    ) : (
                      <>
                        <Send size={13} />
                        Publish thought
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl border"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <AlertCircle size={14} style={{ color: '#EF4444' }} />
                  <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>
                </div>
              )}

              {/* Info */}
              <div className="mt-5 p-4 rounded-xl border"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-start gap-2.5">
                  <Clock size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-muted)' }} />
                  <div>
                    <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--color-fg)' }}>
                      One thought per day
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                      Your thought will be visible to all SameWave users for 24 hours.
                      You can post again after midnight.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
