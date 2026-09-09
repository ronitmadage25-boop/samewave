import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Hand, Sparkles, MessageSquare, Palette,
  PhoneOff, Radio, Volume2
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Room } from '@/types'
import { ThoughtsPanel } from './ThoughtsPanel'
import { Whiteboard } from './Whiteboard'

export function AudioRoomLayout({ room, onLeave }: { room: Room; onLeave: () => void }) {
  const toggleMuteSelf = useAppStore((s) => s.toggleMuteSelf)
  const raiseHandSelf = useAppStore((s) => s.raiseHandSelf)
  const setParticipantReactionEmoji = useAppStore((s) => s.setParticipantReactionEmoji)

  const [activeSideTab, setActiveSideTab] = useState<'thoughts' | 'whiteboard' | 'none'>('thoughts')
  const [showReactions, setShowReactions] = useState(false)

  const self = room.participants.find((p) => p.isSelf)
  const raisedHands = room.participants.filter((p) => p.handRaised)
  const speakers = room.participants.filter((p) => p.presenceState === 'speaking')

  function handleQuickReact(emoji: string) {
    if (self) {
      setParticipantReactionEmoji(self.id, emoji)
      setShowReactions(false)
      setTimeout(() => {
        setParticipantReactionEmoji(self.id, undefined)
      }, 3500)
    }
  }

  const PALETTE_COLORS = [
    '#E8542A', '#4A7FA5', '#7C4AB5', '#2E7D5E', '#E5A93C', '#E24A8D'
  ]

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

        {/* The Audio Mind Floor (Participant tiles with animated acoustic waveforms) */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center justify-center">
          <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 place-items-center">
            {room.participants.map((p) => {
              const isSpeaking = p.presenceState === 'speaking'
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
                    {isSpeaking && (
                      <>
                        <motion.div
                          animate={{ scale: [1, 1.28, 1], opacity: [0.6, 0.15, 0.6] }}
                          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                          className="absolute inset-0 rounded-full border-2"
                          style={{ borderColor: color }}
                        />
                        <motion.div
                          animate={{ scale: [1.1, 1.45, 1.1], opacity: [0.4, 0.05, 0.4] }}
                          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut', delay: 0.2 }}
                          className="absolute inset-0 rounded-full border"
                          style={{ borderColor: color }}
                        />
                      </>
                    )}

                    {/* Participant Avatar circle */}
                    <div
                      className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center font-bold text-xl transition-transform duration-300 shadow-lg ${
                        isSpeaking ? 'scale-105 shadow-xl' : 'opacity-90'
                      }`}
                      style={{
                        backgroundColor: `${color}22`,
                        border: `2px solid ${isSpeaking ? color : 'var(--color-border)'}`,
                        color: color,
                      }}
                    >
                      <span>{p.initials}</span>

                      {/* Mic icon state */}
                      <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-fg)] shadow-sm">
                        {p.isMuted ? (
                          <MicOff size={13} className="text-red-400" />
                        ) : isSpeaking ? (
                          <Volume2 size={13} style={{ color }} className="animate-pulse" />
                        ) : (
                          <Mic size={13} className="text-[var(--color-muted)]" />
                        )}
                      </div>

                      {/* Hand Raised badge */}
                      {p.handRaised && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 p-1.5 rounded-full bg-amber-500 text-black shadow-md"
                        >
                          <Hand size={13} />
                        </motion.div>
                      )}

                      {/* Transient Reaction Emoji Pop-in */}
                      <AnimatePresence>
                        {p.reactionEmoji && (
                          <motion.div
                            initial={{ y: 10, opacity: 0, scale: 0.5 }}
                            animate={{ y: -30, opacity: 1, scale: 1.4 }}
                            exit={{ opacity: 0, y: -45 }}
                            transition={{ duration: 0.5 }}
                            className="absolute -top-2 text-2xl filter drop-shadow-md pointer-events-none"
                          >
                            {p.reactionEmoji}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Name and State Label */}
                  <div className="mt-2.5 text-center">
                    <p className="text-xs font-medium text-[var(--color-fg)] flex items-center justify-center gap-1">
                      {p.name}
                      {p.isSelf && (
                        <span className="text-[9px] px-1 rounded bg-[var(--color-surface-2)] text-[var(--color-muted)] font-mono">
                          YOU
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] font-mono text-[var(--color-muted)]">
                      {isSpeaking ? (
                        <span style={{ color }} className="font-semibold">Speaking…</span>
                      ) : p.handRaised ? (
                        <span className="text-amber-400">Hand raised</span>
                      ) : p.isMuted ? (
                        'Muted'
                      ) : (
                        'Listening'
                      )}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Bottom Audio Control Dock */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between relative">
          {/* Reaction picker floating popover */}
          <AnimatePresence>
            {showReactions && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 p-2 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] shadow-2xl flex items-center gap-2 z-30"
              >
                {['💡', '🔥', '👏', '🤔', '❤️', '🙌'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleQuickReact(emoji)}
                    className="w-10 h-10 rounded-xl hover:scale-125 transition-transform flex items-center justify-center text-xl"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Left info */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--color-muted)]">
            <Radio size={14} className="text-[var(--color-audio-room)]" />
            <span>HD Voice active</span>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-3 mx-auto sm:mx-0">
            {/* Mic Toggle */}
            <button
              onClick={toggleMuteSelf}
              className={`p-3.5 rounded-full transition-all flex items-center gap-2 font-medium text-xs shadow-md ${
                self?.isMuted
                  ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                  : 'bg-[var(--color-signal)] text-white hover:opacity-90'
              }`}
              title={self?.isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {self?.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              <span className="hidden md:inline">{self?.isMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            {/* Raise Hand Toggle */}
            <button
              onClick={raiseHandSelf}
              className={`p-3.5 rounded-full transition-all flex items-center gap-2 font-medium text-xs border ${
                self?.handRaised
                  ? 'bg-amber-500 text-black border-amber-600 shadow-md font-bold'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-fg)] border-[var(--color-border)] hover:bg-[var(--color-surface)]'
              }`}
              title={self?.handRaised ? 'Lower hand' : 'Raise hand to speak'}
            >
              <Hand size={18} />
              <span className="hidden md:inline">{self?.handRaised ? 'Lower Hand' : 'Raise Hand'}</span>
            </button>

            {/* Quick Emoji Reaction */}
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-3.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-fg)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors shadow-sm"
              title="Send room reaction"
            >
              <Sparkles size={18} />
            </button>

            {/* Leave Room Button */}
            <button
              onClick={onLeave}
              className="p-3.5 rounded-full bg-red-600/90 hover:bg-red-600 text-white shadow-md transition-colors"
              title="Leave audio room"
            >
              <PhoneOff size={18} />
            </button>
          </div>

          {/* Right drawer toggles */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveSideTab(activeSideTab === 'thoughts' ? 'none' : 'thoughts')}
              className={`p-2.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                activeSideTab === 'thoughts'
                  ? 'bg-[var(--color-surface-2)] border-[var(--color-signal)] text-[var(--color-signal)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]'
              }`}
              title="Toggle thoughts panel"
            >
              <MessageSquare size={16} />
              <span className="hidden lg:inline text-[11px] font-mono">Thoughts ({room.thoughts.length})</span>
            </button>

            <button
              onClick={() => setActiveSideTab(activeSideTab === 'whiteboard' ? 'none' : 'whiteboard')}
              className={`p-2.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                activeSideTab === 'whiteboard'
                  ? 'bg-[var(--color-surface-2)] border-[var(--color-signal)] text-[var(--color-signal)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]'
              }`}
              title="Toggle whiteboard"
            >
              <Palette size={16} />
              <span className="hidden lg:inline text-[11px] font-mono">Canvas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Side Drawer for Thoughts or Whiteboard */}
      <AnimatePresence>
        {activeSideTab !== 'none' && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 420, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="border-l border-[var(--color-border)] h-full overflow-hidden flex flex-col bg-[var(--color-surface)] shadow-2xl z-20"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <span className="text-xs font-mono uppercase tracking-wider font-semibold text-[var(--color-fg)]">
                {activeSideTab === 'thoughts' ? 'Thoughts & Questions' : 'Collaborative Canvas'}
              </span>
              <button
                onClick={() => setActiveSideTab('none')}
                className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-hidden relative">
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
