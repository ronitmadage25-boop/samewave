import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Hand, Sparkles, MessageSquare, Palette,
  PhoneOff, AlertTriangle, Loader2
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useWebRTC } from '@/hooks/useWebRTC'
import type { Room } from '@/types'
import { ThoughtsPanel } from './ThoughtsPanel'
import { Whiteboard } from './Whiteboard'

const PALETTE_COLORS = [
  '#E8542A', '#4A7FA5', '#7C4AB5', '#2E7D5E', '#E5A93C', '#E24A8D'
]

interface AudioRoomLayoutProps {
  room: Room
  onLeave: () => void
  onPresenceUpdate?: (updates: {
    isMuted?: boolean
    hasVideo?: boolean
    handRaised?: boolean
    presenceState?: string
  }) => void
}

export function AudioRoomLayout({ room, onLeave, onPresenceUpdate }: AudioRoomLayoutProps) {
  const raiseHandSelf = useAppStore((s) => s.raiseHandSelf)
  const setParticipantReactionEmoji = useAppStore((s) => s.setParticipantReactionEmoji)
  const user = useAppStore((s) => s.user)

  const [activeSideTab, setActiveSideTab] = useState<'thoughts' | 'whiteboard' | 'none'>('thoughts')
  const [showReactions, setShowReactions] = useState(false)

  const self = room.participants.find((p) => p.isSelf)
  const raisedHands = room.participants.filter((p) => p.handRaised)
  const speakers = room.participants.filter((p) => p.presenceState === 'speaking')

  // Real WebRTC audio
  const {
    isMuted,
    micPermission,
    toggleMic,
    isSpeaking,
    cleanup,
  } = useWebRTC({
    roomId: room.id,
    mode: 'audio',
    enabled: true,
  })

  // Sync mute state with presence
  useEffect(() => {
    onPresenceUpdate?.({ isMuted })
  }, [isMuted])

  // Sync speaking state with participants
  useEffect(() => {
    if (user) {
      useAppStore.getState().setParticipantSpeaking(user.id, isSpeaking)
    }
  }, [isSpeaking, user?.id])

  // Cleanup WebRTC on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  function handleRaiseHand() {
    raiseHandSelf()
    onPresenceUpdate?.({ handRaised: !self?.handRaised })
  }

  function handleQuickReact(emoji: string) {
    if (self) {
      setParticipantReactionEmoji(self.id, emoji)
      setShowReactions(false)
      setTimeout(() => {
        setParticipantReactionEmoji(self.id, undefined)
      }, 3500)
    }
  }

  function handleLeave() {
    cleanup()
    onLeave()
  }

  const QUICK_REACTIONS = ['✨', '💡', '🔥', '👏', '🤔', '💯']

  return (
    <div className="flex-1 flex overflow-hidden relative bg-[var(--color-bg)]">
      {/* Center Stage: Audio Minds */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Stage Status Bar */}
        <div className="px-6 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)]/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-audio-room)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--color-audio-room)]" />
              </span>
              <span className="text-xs font-mono font-medium tracking-wide uppercase text-[var(--color-audio-room)]">
                Audio Stage • {speakers.length} Speaking Now
              </span>
            </div>
          </div>

          {raisedHands.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
              <Hand size={13} className="animate-bounce" />
              <span className="font-mono">{raisedHands.length} in queue</span>
            </div>
          )}
        </div>

        {/* Participant Floor */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center justify-center">
          <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 place-items-center">
            {room.participants.map((p) => {
              const isSpeakingNow = p.presenceState === 'speaking'
              const color = PALETTE_COLORS[p.colorSeed % PALETTE_COLORS.length]

              return (
                <motion.div
                  key={p.id}
                  layout
                  className="flex flex-col items-center group relative w-full"
                >
                  {/* Avatar & Waveform Halo */}
                  <div className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28">
                    {/* Acoustic ring when speaking */}
                    {isSpeakingNow && (
                      <>
                        <motion.div
                          className="absolute rounded-full"
                          style={{ background: color, opacity: 0.12 }}
                          animate={{ scale: [1, 1.35, 1] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                          initial={{ width: '100%', height: '100%' }}
                        />
                        <motion.div
                          className="absolute rounded-full"
                          style={{ background: color, opacity: 0.08 }}
                          animate={{ scale: [1, 1.6, 1] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                          initial={{ width: '100%', height: '100%' }}
                        />
                      </>
                    )}

                    {/* Avatar circle */}
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={p.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover relative z-10"
                        style={{
                          border: isSpeakingNow ? `3px solid ${color}` : '3px solid transparent',
                          boxShadow: isSpeakingNow ? `0 0 20px ${color}60` : 'none',
                          transition: 'all 0.3s ease',
                        }}
                      />
                    ) : (
                      <div
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-lg font-bold relative z-10 transition-all"
                        style={{
                          background: color,
                          color: 'white',
                          border: isSpeakingNow ? `3px solid ${color}` : '3px solid transparent',
                          boxShadow: isSpeakingNow ? `0 0 20px ${color}60` : 'none',
                        }}
                      >
                        {p.initials.slice(0, 2)}
                      </div>
                    )}

                    {/* Muted indicator */}
                    {p.isMuted && (
                      <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center z-20"
                        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                        <MicOff size={11} style={{ color: 'var(--color-muted)' }} />
                      </div>
                    )}

                    {/* Hand raised */}
                    {p.handRaised && (
                      <div className="absolute -top-2 -right-2 text-lg z-20">✋</div>
                    )}

                    {/* Reaction emoji float */}
                    <AnimatePresence>
                      {p.reactionEmoji && (
                        <motion.div
                          initial={{ opacity: 0, y: 0, scale: 0.5 }}
                          animate={{ opacity: 1, y: -30, scale: 1.2 }}
                          exit={{ opacity: 0, y: -50 }}
                          className="absolute -top-8 left-1/2 -translate-x-1/2 text-2xl z-30 pointer-events-none"
                        >
                          {p.reactionEmoji}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Acoustic waveform under speaking participants */}
                  {isSpeakingNow && (
                    <div className="flex items-center gap-[2px] h-5 mt-2">
                      {[3, 7, 5, 9, 6, 4, 8, 5].map((h, i) => (
                        <div
                          key={i}
                          className="animate-wave-bar rounded-full"
                          style={{
                            width: 2,
                            height: `${h}px`,
                            background: color,
                            '--duration': `${0.6 + (i % 4) * 0.15}s`,
                            '--delay': `${i * 0.08}s`,
                          } as React.CSSProperties}
                        />
                      ))}
                    </div>
                  )}

                  <p className={`text-xs font-medium mt-2 text-center max-w-[80px] truncate ${isSpeakingNow ? 'font-semibold' : ''}`}
                    style={{ color: isSpeakingNow ? 'var(--color-fg)' : 'var(--color-muted)' }}>
                    {p.isSelf ? 'You' : p.name}
                  </p>
                  {p.isSelf && (
                    <span className="text-[9px] font-mono uppercase tracking-widest mt-0.5"
                      style={{ color: 'var(--color-signal)' }}>
                      {isSpeaking ? 'speaking' : isMuted ? 'muted' : 'live'}
                    </span>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Control Bar */}
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4">
          {/* Mic permission error */}
          {(micPermission === 'denied' || micPermission === 'unavailable') && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 rounded-xl border mb-4 text-xs"
              style={{ background: 'var(--color-signal-soft)', borderColor: 'var(--color-signal)', color: 'var(--color-signal)' }}
            >
              <AlertTriangle size={14} className="shrink-0" />
              <span>
                {micPermission === 'denied'
                  ? 'Microphone access denied. Allow microphone access in your browser settings to speak.'
                  : 'No microphone found on this device.'}
              </span>
            </motion.div>
          )}

          <div className="flex items-center justify-center gap-4">
            {/* Mic toggle */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={toggleMic}
              disabled={micPermission === 'denied' || micPermission === 'unavailable'}
              className="flex flex-col items-center gap-1.5 group disabled:opacity-40"
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: !isMuted ? 'var(--color-audio-room)' : 'var(--color-surface-2)',
                  border: `2px solid ${!isMuted ? 'var(--color-audio-room)' : 'var(--color-border)'}`,
                  boxShadow: !isMuted ? '0 0 20px rgba(124,74,181,0.4)' : 'none',
                }}>
                {micPermission === 'requesting' ? (
                  <Loader2 size={22} className="animate-spin text-white" />
                ) : isMuted ? (
                  <MicOff size={22} className="text-[var(--color-muted)]" />
                ) : (
                  <Mic size={22} className="text-white" />
                )}
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest"
                style={{ color: 'var(--color-muted)' }}>
                {micPermission === 'requesting' ? 'Requesting…' : isMuted ? 'Muted' : 'Mic On'}
              </span>
            </motion.button>

            {/* Raise Hand */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleRaiseHand}
              className="flex flex-col items-center gap-1.5"
              aria-label={self?.handRaised ? 'Lower hand' : 'Raise hand'}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: self?.handRaised ? 'rgba(245, 158, 11, 0.2)' : 'var(--color-surface-2)',
                  border: `2px solid ${self?.handRaised ? 'rgb(245, 158, 11)' : 'var(--color-border)'}`,
                }}>
                <Hand size={22}
                  style={{ color: self?.handRaised ? 'rgb(245, 158, 11)' : 'var(--color-muted)' }}
                />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest"
                style={{ color: 'var(--color-muted)' }}>
                {self?.handRaised ? 'Hand up' : 'Raise'}
              </span>
            </motion.button>

            {/* Reactions */}
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setShowReactions(!showReactions)}
                className="flex flex-col items-center gap-1.5"
                aria-label="Send reaction"
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
                  style={{ background: 'var(--color-surface-2)', border: '2px solid var(--color-border)' }}>
                  <Sparkles size={22} style={{ color: 'var(--color-muted)' }} />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest"
                  style={{ color: 'var(--color-muted)' }}>React</span>
              </motion.button>
              <AnimatePresence>
                {showReactions && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 8 }}
                    className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex gap-2 p-2 rounded-2xl border shadow-xl"
                    style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}
                  >
                    {QUICK_REACTIONS.map((emoji) => (
                      <motion.button
                        key={emoji}
                        whileHover={{ scale: 1.3 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleQuickReact(emoji)}
                        className="text-xl w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Side panel toggle */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setActiveSideTab(activeSideTab !== 'none' ? 'none' : 'thoughts')}
              className="flex flex-col items-center gap-1.5"
              aria-label="Toggle thoughts panel"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: activeSideTab !== 'none' ? 'var(--color-text-room-soft)' : 'var(--color-surface-2)',
                  border: `2px solid ${activeSideTab !== 'none' ? 'var(--color-text-room)' : 'var(--color-border)'}`,
                }}>
                <MessageSquare size={22}
                  style={{ color: activeSideTab !== 'none' ? 'var(--color-text-room)' : 'var(--color-muted)' }}
                />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest"
                style={{ color: 'var(--color-muted)' }}>Thoughts</span>
            </motion.button>

            {/* Leave */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleLeave}
              className="flex flex-col items-center gap-1.5"
              aria-label="Leave room"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
                style={{ background: 'rgba(196, 57, 47, 0.15)', border: '2px solid rgba(196, 57, 47, 0.4)' }}>
                <PhoneOff size={22} style={{ color: '#C4392F' }} />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest"
                style={{ color: 'var(--color-muted)' }}>Leave</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Side Panel: Thoughts or Whiteboard */}
      <AnimatePresence>
        {activeSideTab !== 'none' && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="hidden md:flex flex-col border-l border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]/30"
          >
            {/* Tab switcher */}
            <div className="flex items-center border-b border-[var(--color-border)] p-2 gap-1 shrink-0">
              <button
                onClick={() => setActiveSideTab('thoughts')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: activeSideTab === 'thoughts' ? 'var(--color-surface-2)' : 'transparent',
                  color: activeSideTab === 'thoughts' ? 'var(--color-fg)' : 'var(--color-muted)',
                }}
              >
                <MessageSquare size={13} /> Thoughts
              </button>
              <button
                onClick={() => setActiveSideTab('whiteboard')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: activeSideTab === 'whiteboard' ? 'var(--color-surface-2)' : 'transparent',
                  color: activeSideTab === 'whiteboard' ? 'var(--color-fg)' : 'var(--color-muted)',
                }}
              >
                <Palette size={13} /> Canvas
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {activeSideTab === 'thoughts' ? (
                <ThoughtsPanel room={room} />
              ) : (
                <Whiteboard />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
