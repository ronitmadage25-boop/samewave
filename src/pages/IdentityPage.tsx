import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Bookmark, Radio, Zap, MessageSquare, Mic, Video,
  Send, Check, User as UserIcon, LogOut, Edit3, ShieldCheck
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
  const identityWavelengths = useAppStore((s) => s.identityWavelengths)
  const savedMoments = useAppStore((s) => s.savedMoments)
  const wavelength = useAppStore((s) => s.wavelength)
  const myDailySignal = useAppStore((s) => s.myDailySignal)
  const publishDailySignal = useAppStore((s) => s.publishDailySignal)

  const { user, profile, isAuthenticated, signOut, openAuthModal } = useAuth()

  const [signalDraft, setSignalDraft] = useState('')
  const [signalPublished, setSignalPublished] = useState(false)
  const [bio, setBio] = useState(() => localStorage.getItem('samewave_bio') || 'Exploring ideas on SameWave.')
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [bioDraft, setBioDraft] = useState(bio)
  const MAX_SIGNAL = 120

  function handlePublish() {
    if (!isAuthenticated) {
      openAuthModal('Sign in with Google to publish a daily signal.')
      return
    }

    if (signalDraft.trim().length < 4) return
    publishDailySignal(signalDraft.trim())
    setSignalPublished(true)
    setSignalDraft('')
  }

  function handleSaveBio() {
    const trimmed = bioDraft.trim() || 'Exploring ideas on SameWave.'
    setBio(trimmed)
    localStorage.setItem('samewave_bio', trimmed)
    setIsEditingBio(false)
  }

  const activeMoments = wavelength ? 1 : 0

  return (
    <div className="min-h-screen pb-24 lg:pb-12 bg-[var(--color-bg)]">
      {/* Header */}
      <header className="px-6 lg:px-10 py-6 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[var(--color-fg)]">
            Your Wavelength Identity
          </h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Identity on SameWave is about active resonance, not followers.
          </p>
        </div>

        {isAuthenticated ? (
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--color-muted)] hover:text-red-400 border border-[var(--color-border)] hover:border-red-400/30 transition-colors"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        ) : (
          <button
            onClick={() => openAuthModal('Sign in with Google to access your persistent profile.')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--color-signal)] text-white hover:opacity-90 transition-opacity shadow-md"
          >
            <UserIcon size={14} />
            <span>Sign In with Google</span>
          </button>
        )}
      </header>

      <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto space-y-8">
        {/* Profile Identity Card */}
        <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] relative overflow-hidden shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* Avatar circle */}
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName || 'Profile'}
                  className="w-16 h-16 rounded-full border-2 border-[var(--color-signal)] object-cover shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[var(--color-signal)]/15 border-2 border-[var(--color-signal)] flex items-center justify-center text-[var(--color-signal)] font-display font-bold text-2xl shadow-md">
                  {(profile?.initials || user?.email || 'Guest').slice(0, 2).toUpperCase()}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-bold text-[var(--color-fg)]">
                    {profile?.displayName || (isAuthenticated ? user?.email?.split('@')[0] : 'Guest Explorer')}
                  </h2>
                  {isAuthenticated ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <ShieldCheck size={11} />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-muted)]">
                      Guest Session
                    </span>
                  )}
                </div>

                <p className="text-xs font-mono text-[var(--color-muted)] mt-0.5">
                  @{user?.email?.split('@')[0] || (isAuthenticated ? 'authenticated_user' : 'guest_wavelength')}
                </p>

                {/* Bio */}
                <div className="mt-2 text-xs text-[var(--color-muted)]">
                  {isEditingBio ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        value={bioDraft}
                        onChange={(e) => setBioDraft(e.target.value)}
                        placeholder="Write a brief bio..."
                        className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-2.5 py-1 text-xs text-[var(--color-fg)] outline-none"
                      />
                      <button
                        onClick={handleSaveBio}
                        className="px-2.5 py-1 rounded-lg bg-[var(--color-signal)] text-white text-[11px] font-semibold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingBio(false)}
                        className="text-[11px] text-[var(--color-muted)]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p>{bio}</p>
                      {isAuthenticated && (
                        <button
                          onClick={() => {
                            setBioDraft(bio)
                            setIsEditingBio(true)
                          }}
                          className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                        >
                          <Edit3 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Guest Action Prompt */}
            {!isAuthenticated && (
              <div className="p-4 rounded-2xl bg-[var(--color-signal-soft)] border border-[var(--color-signal)]/30 text-xs space-y-2 max-w-sm">
                <p className="font-semibold text-[var(--color-signal)]">
                  Save your identity across devices
                </p>
                <p className="text-[var(--color-muted)] leading-relaxed text-[11px]">
                  Sign in with Google to create your persistent wavelength profile, host rooms, and collect moments.
                </p>
                <button
                  onClick={() => openAuthModal('Sign in with Google to sync your wavelength profile.')}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--color-signal)] text-white font-semibold text-xs hover:opacity-90 transition-opacity shadow-sm"
                >
                  Sign In with Google
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: wavelength + signal + stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="font-display text-3xl font-bold text-[var(--color-fg)] mb-1">
                  {activeMoments}
                </div>
                <div className="text-[11px] font-mono uppercase tracking-wide text-[var(--color-muted)]">
                  active moments
                </div>
              </div>
              <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="font-display text-3xl font-bold text-[var(--color-signal)] mb-1">
                  {savedMoments.length}
                </div>
                <div className="text-[11px] font-mono uppercase tracking-wide text-[var(--color-muted)]">
                  saved moments
                </div>
              </div>
            </div>

            {/* Wavelength */}
            <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-muted)] mb-3">
                Your wavelength
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {identityWavelengths.map((w) => (
                  <span
                    key={w}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-resonance-soft)] text-[var(--color-resonance)] border border-[var(--color-resonance)]/30"
                  >
                    {w}
                  </span>
                ))}
              </div>
              <button
                onClick={() => navigate('/intent')}
                className="flex items-center gap-1.5 text-xs text-[var(--color-signal)] hover:underline font-medium"
              >
                <Radio size={12} />
                <span>Broadcast new intent →</span>
              </button>
            </div>

            {/* Daily Signal */}
            <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-[var(--color-signal)]" />
                <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-muted)]">
                  Daily Signal
                </p>
              </div>

              <AnimatePresence mode="wait">
                {myDailySignal || signalPublished ? (
                  <motion.div
                    key="published"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
                      <Check size={14} />
                      <span>Today's signal broadcasted</span>
                    </div>
                    <p className="text-xs italic text-[var(--color-fg)]">
                      "{myDailySignal?.text || signalDraft}"
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="composer" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p className="text-xs text-[var(--color-muted)] mb-2">
                      One thought for today.
                    </p>
                    <textarea
                      value={signalDraft}
                      onChange={(e) => setSignalDraft(e.target.value.slice(0, MAX_SIGNAL))}
                      placeholder="What is occupying your mind today?"
                      rows={2}
                      className="w-full bg-[var(--color-bg)] text-xs text-[var(--color-fg)] placeholder-[var(--color-muted)] outline-none border border-[var(--color-border)] rounded-xl p-2.5 resize-none mb-2"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[var(--color-muted)]">
                        {signalDraft.length}/{MAX_SIGNAL}
                      </span>
                      <button
                        onClick={handlePublish}
                        disabled={signalDraft.trim().length < 4}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-signal)] text-white disabled:opacity-40"
                      >
                        <Send size={11} />
                        <span>Publish</span>
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
              <Bookmark size={16} className="text-[var(--color-signal)]" />
              <h3 className="font-display text-base font-bold text-[var(--color-fg)]">
                Saved Moments
              </h3>
            </div>

            {savedMoments.length === 0 ? (
              <div className="p-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-center space-y-2">
                <Bookmark size={28} className="mx-auto text-[var(--color-muted)] opacity-50" />
                <p className="font-semibold text-sm text-[var(--color-fg)]">No moments preserved yet</p>
                <p className="text-xs text-[var(--color-muted)] max-w-sm mx-auto">
                  When you participate in a room and wrap up, you can anchor the shared constellation into your identity.
                </p>
                <button
                  onClick={() => navigate('/rooms')}
                  className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-[var(--color-signal)] text-[var(--color-fg)] transition-colors"
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
                    <div
                      key={moment.id}
                      className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="p-1.5 rounded-lg text-white"
                            style={{ backgroundColor: typeColor }}
                          >
                            <Icon size={12} />
                          </span>
                          <h4 className="font-bold text-sm text-[var(--color-fg)]">
                            {moment.topicLabel}
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--color-muted)]">
                          {formatDate(moment.savedAt)}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center p-2 rounded-xl bg-[var(--color-bg)]">
                        <div>
                          <div className="font-display font-bold text-sm text-[var(--color-fg)]">
                            {moment.mindsGathered}
                          </div>
                          <div className="text-[9px] font-mono uppercase text-[var(--color-muted)]">Minds</div>
                        </div>
                        <div>
                          <div className="font-display font-bold text-sm text-[var(--color-fg)]">
                            {moment.thoughtsShared}
                          </div>
                          <div className="text-[9px] font-mono uppercase text-[var(--color-muted)]">Thoughts</div>
                        </div>
                        <div>
                          <div className="font-display font-bold text-sm text-[var(--color-fg)]">
                            {moment.connectionsFormed}
                          </div>
                          <div className="text-[9px] font-mono uppercase text-[var(--color-muted)]">Links</div>
                        </div>
                        <div>
                          <div className="font-display font-bold text-sm text-[var(--color-resonance)]">
                            {moment.perspectivesEmerged}
                          </div>
                          <div className="text-[9px] font-mono uppercase text-[var(--color-muted)]">Perspectives</div>
                        </div>
                      </div>

                      {moment.highlightThoughts.length > 0 && (
                        <div className="space-y-1">
                          {moment.highlightThoughts.slice(0, 2).map((thought, i) => (
                            <p key={i} className="text-xs text-[var(--color-muted)] italic line-clamp-1">
                              "{thought}"
                            </p>
                          ))}
                        </div>
                      )}
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
