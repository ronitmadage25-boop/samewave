import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Bookmark, MessageSquare, Mic, Video,
  Check, User as UserIcon, LogOut, Edit3, ShieldCheck,
  Zap, Send, Trash2, PenLine
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useAuth } from '@/hooks/useAuth'
import type { RoomType } from '@/types'

const ROOM_TYPE_ICONS: Record<RoomType, typeof MessageSquare> = { text: MessageSquare, audio: Mic, video: Video }
const ROOM_TYPE_COLORS = {
  text: 'var(--color-text-room)',
  audio: 'var(--color-audio-room)',
  video: 'var(--color-video-room)',
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function IdentityPage() {
  const navigate = useNavigate()
  const savedMoments = useAppStore((s) => s.savedMoments)
  const fetchSavedMoments = useAppStore((s) => s.fetchSavedMoments)
  const deleteSavedMoment = useAppStore((s) => s.deleteSavedMoment)
  const myDailySignal = useAppStore((s) => s.myDailySignal)
  const publishDailySignal = useAppStore((s) => s.publishDailySignal)

  const { user, profile, isAuthenticated, signOut, openAuthModal } = useAuth()

  useEffect(() => {
    if (user) {
      fetchSavedMoments()
    }
  }, [user, fetchSavedMoments])

  const [signalDraft, setSignalDraft] = useState('')
  const [signalPublished, setSignalPublished] = useState(false)
  const [bio, setBio] = useState(() => localStorage.getItem('samewave_bio') || 'Exploring ideas on SameWave.')
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [bioDraft, setBioDraft] = useState(bio)
  const MAX_SIGNAL = 120

  async function handlePublish() {
    if (!isAuthenticated) {
      openAuthModal('Sign in with Google to publish a daily thought.')
      return
    }
    if (signalDraft.trim().length < 4) return
    const { error } = await publishDailySignal(signalDraft.trim())
    if (!error) {
      setSignalPublished(true)
      setSignalDraft('')
    }
  }

  function handleSaveBio() {
    const trimmed = bioDraft.trim() || 'Exploring ideas on SameWave.'
    setBio(trimmed)
    localStorage.setItem('samewave_bio', trimmed)
    setIsEditingBio(false)
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-12" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <header className="px-6 lg:px-10 py-5 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--color-fg)' }}>
            Identity
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            Your presence on SameWave
          </p>
        </div>

        {isAuthenticated ? (
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        ) : (
          <button
            onClick={() => openAuthModal('Sign in with Google to access your profile.')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-md"
            style={{ background: 'var(--color-signal)', color: 'white' }}
          >
            <UserIcon size={14} />
            <span>Sign In</span>
          </button>
        )}
      </header>

      <div className="px-6 lg:px-10 py-8 max-w-4xl mx-auto space-y-8">
        {/* Profile Card */}
        <div className="p-6 rounded-2xl border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName || 'Profile'}
                  className="w-16 h-16 rounded-full object-cover"
                  style={{ border: '2px solid var(--color-signal)' }}
                />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                  style={{ background: 'var(--color-signal)' }}>
                  {(profile?.initials || 'G').slice(0, 2).toUpperCase()}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-display text-xl font-bold" style={{ color: 'var(--color-fg)' }}>
                    {profile?.displayName || (isAuthenticated ? user?.email?.split('@')[0] : 'Guest Explorer')}
                  </h2>
                  {isAuthenticated ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}>
                      <ShieldCheck size={10} />
                      Verified
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--color-surface-2)', color: 'var(--color-muted)' }}>
                      Guest
                    </span>
                  )}
                </div>

                {user?.email && (
                  <p className="text-xs font-mono mb-2" style={{ color: 'var(--color-muted)' }}>
                    {user.email}
                  </p>
                )}

                {/* Bio */}
                <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  {isEditingBio ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={bioDraft}
                        onChange={(e) => setBioDraft(e.target.value)}
                        placeholder="Write a brief bio..."
                        className="rounded-lg px-2.5 py-1 text-xs outline-none"
                        style={{
                          background: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-fg)',
                        }}
                      />
                      <button onClick={handleSaveBio}
                        className="px-2.5 py-1 rounded-lg text-white text-[11px] font-semibold"
                        style={{ background: 'var(--color-signal)' }}>
                        Save
                      </button>
                      <button onClick={() => setIsEditingBio(false)}
                        className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p>{bio}</p>
                      {isAuthenticated && (
                        <button onClick={() => { setBioDraft(bio); setIsEditingBio(true) }}
                          style={{ color: 'var(--color-muted)' }}>
                          <Edit3 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sign in prompt */}
            {!isAuthenticated && (
              <div className="p-4 rounded-xl border max-w-xs"
                style={{ background: 'var(--color-signal-soft)', borderColor: 'var(--color-signal)30' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-signal)' }}>
                  Save your identity
                </p>
                <p className="text-[11px] mb-3" style={{ color: 'var(--color-muted)' }}>
                  Sign in with Google to create your persistent profile and host rooms.
                </p>
                <button
                  onClick={() => openAuthModal('Sign in with Google to sync your profile.')}
                  className="px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold"
                  style={{ background: 'var(--color-signal)' }}
                >
                  Sign In with Google
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left sidebar */}
          <div className="space-y-5">
            {/* Quick actions */}
            <div className="p-5 rounded-2xl border"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-mono uppercase tracking-widest mb-4"
                style={{ color: 'var(--color-muted)' }}>
                Quick actions
              </p>
              <div className="space-y-2">
                <button onClick={() => navigate('/create-room')}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-fg)' }}>
                  <Zap size={14} style={{ color: 'var(--color-signal)' }} />
                  Create a room
                </button>
                <button onClick={() => navigate('/current')}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-fg)' }}>
                  <PenLine size={14} style={{ color: 'var(--color-signal)' }} />
                  Post today's thought
                </button>
                <button onClick={() => navigate('/rooms')}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-fg)' }}>
                  <Mic size={14} style={{ color: 'var(--color-audio-room)' }} />
                  Browse live rooms
                </button>
              </div>
            </div>

            {/* Daily Signal composer */}
            <div className="p-5 rounded-2xl border"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} style={{ color: 'var(--color-signal)' }} />
                <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
                  Daily Thought
                </p>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                  style={{ background: 'var(--color-signal-soft)', color: 'var(--color-signal)' }}>
                  Once/day
                </span>
              </div>

              <AnimatePresence mode="wait">
                {myDailySignal || signalPublished ? (
                  <motion.div key="published" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="flex items-center gap-2 text-xs font-medium mb-2"
                      style={{ color: '#34D399' }}>
                      <Check size={13} />
                      Today's thought sent
                    </div>
                    <p className="text-xs italic" style={{ color: 'var(--color-fg)' }}>
                      "{myDailySignal?.text}"
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="composer" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <textarea
                      value={signalDraft}
                      onChange={(e) => setSignalDraft(e.target.value.slice(0, MAX_SIGNAL))}
                      placeholder="One thought for today…"
                      rows={2}
                      className="w-full text-xs outline-none rounded-xl px-3 py-2.5 resize-none mb-2 placeholder:opacity-30"
                      style={{
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-fg)',
                      }}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono" style={{ color: 'var(--color-muted)' }}>
                        {signalDraft.length}/{MAX_SIGNAL}
                      </span>
                      <button
                        onClick={handlePublish}
                        disabled={signalDraft.trim().length < 4}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
                        style={{ background: 'var(--color-signal)' }}
                      >
                        <Send size={11} />
                        Publish
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Saved moments */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Bookmark size={16} style={{ color: 'var(--color-signal)' }} />
              <h3 className="font-display text-base font-bold" style={{ color: 'var(--color-fg)' }}>
                Saved Moments
              </h3>
            </div>

            {savedMoments.length === 0 ? (
              <div className="p-8 rounded-2xl border text-center space-y-2"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <Bookmark size={28} className="mx-auto opacity-30" style={{ color: 'var(--color-muted)' }} />
                <p className="font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>
                  No moments saved yet
                </p>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  When you participate in a room and save a moment, it appears here.
                </p>
                <button
                  onClick={() => navigate('/rooms')}
                  className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-fg)' }}
                >
                  Explore Live Rooms
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {savedMoments.map((moment) => {
                  const Icon = ROOM_TYPE_ICONS[moment.roomType]
                  const typeColor = ROOM_TYPE_COLORS[moment.roomType]
                  return (
                    <div key={moment.id} className="p-5 rounded-2xl border space-y-3"
                      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg text-white" style={{ backgroundColor: typeColor }}>
                            <Icon size={12} />
                          </span>
                          <h4 className="font-bold text-sm" style={{ color: 'var(--color-fg)' }}>
                            {moment.topicLabel}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono" style={{ color: 'var(--color-muted)' }}>
                            {formatDate(moment.savedAt)}
                          </span>
                          <button
                            onClick={async () => {
                              if (window.confirm('Delete this saved moment?')) {
                                await deleteSavedMoment(moment.id)
                              }
                            }}
                            className="p-1 rounded-md text-[var(--color-muted)] hover:text-red-400 hover:bg-white/5 transition-colors"
                            title="Delete saved moment"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center p-2 rounded-xl"
                        style={{ background: 'var(--color-bg)' }}>
                        {[
                          { value: moment.mindsGathered, label: 'Minds' },
                          { value: moment.thoughtsShared, label: 'Thoughts' },
                          { value: moment.connectionsFormed, label: 'Links' },
                          { value: moment.perspectivesEmerged, label: 'Perspectives', color: 'var(--color-resonance)' },
                        ].map((stat) => (
                          <div key={stat.label}>
                            <div className="font-display font-bold text-sm"
                              style={{ color: stat.color || 'var(--color-fg)' }}>
                              {stat.value}
                            </div>
                            <div className="text-[9px] font-mono uppercase" style={{ color: 'var(--color-muted)' }}>
                              {stat.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
