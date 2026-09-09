import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, Hand, Sparkles,
  MessageSquare, Palette, PhoneOff, LayoutGrid, Maximize2
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Room, Participant } from '@/types'
import { ThoughtsPanel } from './ThoughtsPanel'
import { Whiteboard } from './Whiteboard'

export function VideoRoomLayout({ room, onLeave }: { room: Room; onLeave: () => void }) {
  const toggleMuteSelf = useAppStore((s) => s.toggleMuteSelf)
  const toggleVideoSelf = useAppStore((s) => s.toggleVideoSelf)
  const raiseHandSelf = useAppStore((s) => s.raiseHandSelf)
  const setParticipantReactionEmoji = useAppStore((s) => s.setParticipantReactionEmoji)

  const [activeSideTab, setActiveSideTab] = useState<'thoughts' | 'whiteboard' | 'none'>('none')
  const [showReactions, setShowReactions] = useState(false)
  const [layoutMode, setLayoutMode] = useState<'grid' | 'speaker'>('grid')
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null)

  const self = room.participants.find((p) => p.isSelf)
  const speakers = room.participants.filter((p) => p.presenceState === 'speaking')
  const primarySpeaker = pinnedParticipantId
    ? room.participants.find((p) => p.id === pinnedParticipantId)
    : speakers[0] || room.participants[0]

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
      {/* Main Video Presentation Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Video Mode Bar */}
        <div className="px-6 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)]/30">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-video-room)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--color-video-room)]" />
            </span>
            <span className="text-xs font-mono font-medium tracking-wide uppercase text-[var(--color-video-room)]">
              Video Space • {room.participants.length} Active Minds
            </span>
          </div>

          <div className="flex items-center gap-1 border border-[var(--color-border)] rounded-lg p-0.5 bg-[var(--color-surface)]">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
                layoutMode === 'grid'
                  ? 'bg-[var(--color-surface-2)] text-[var(--color-fg)] font-semibold'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
              }`}
            >
              <LayoutGrid size={13} />
              Grid
            </button>
            <button
              onClick={() => setLayoutMode('speaker')}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
                layoutMode === 'speaker'
                  ? 'bg-[var(--color-surface-2)] text-[var(--color-fg)] font-semibold'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
              }`}
            >
              <Maximize2 size={13} />
              Spotlight
            </button>
          </div>
        </div>

        {/* Video Tiles Canvas */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex items-center justify-center">
          {layoutMode === 'speaker' && primarySpeaker ? (
            /* Spotlight Mode: Large main video + side strip */
            <div className="w-full h-full flex flex-col md:flex-row gap-4">
              <div className="flex-1 h-full min-h-[300px]">
                <VideoCard
                  participant={primarySpeaker}
                  isPrimary
                  color={PALETTE_COLORS[primarySpeaker.colorSeed % PALETTE_COLORS.length]}
                />
              </div>
              <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto md:w-56 shrink-0">
                {room.participants
                  .filter((p) => p.id !== primarySpeaker.id)
                  .map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setPinnedParticipantId(p.id)}
                      className="cursor-pointer w-44 md:w-full h-28 shrink-0"
                    >
                      <VideoCard
                        participant={p}
                        color={PALETTE_COLORS[p.colorSeed % PALETTE_COLORS.length]}
                      />
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            /* Grid Mode: Dynamic grid layout */
            <div
              className={`w-full h-full max-w-6xl grid gap-4 p-2 place-content-center ${
                room.participants.length <= 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : room.participants.length <= 4
                  ? 'grid-cols-2'
                  : 'grid-cols-2 md:grid-cols-3'
              }`}
            >
              {room.participants.map((p) => (
                <VideoCard
                  key={p.id}
                  participant={p}
                  color={PALETTE_COLORS[p.colorSeed % PALETTE_COLORS.length]}
                  onSelect={() => {
                    setPinnedParticipantId(p.id)
                    setLayoutMode('speaker')
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom Video Control Dock */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between relative">
          {/* Reaction picker popover */}
          <AnimatePresence>
            {showReactions && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 p-2 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] shadow-2xl flex items-center gap-2 z-30"
              >
                {['✨', '🌊', '💡', '🔥', '👏', '🎯'].map((emoji) => (
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

          <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--color-muted)]">
            <VideoIcon size={14} className="text-[var(--color-video-room)]" />
            <span>Encrypted Room</span>
          </div>

          {/* Central Controls */}
          <div className="flex items-center gap-3 mx-auto sm:mx-0">
            {/* Mic Toggle */}
            <button
              onClick={toggleMuteSelf}
              className={`p-3.5 rounded-full transition-all flex items-center gap-2 font-medium text-xs shadow-md ${
                self?.isMuted
                  ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-fg)] border border-[var(--color-border)] hover:bg-[var(--color-surface)]'
              }`}
              title={self?.isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {self?.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Video Camera Toggle */}
            <button
              onClick={toggleVideoSelf}
              className={`p-3.5 rounded-full transition-all flex items-center gap-2 font-medium text-xs shadow-md ${
                self?.hasVideo === false
                  ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                  : 'bg-[var(--color-signal)] text-white hover:opacity-90'
              }`}
              title={self?.hasVideo === false ? 'Turn video on' : 'Turn video off'}
            >
              {self?.hasVideo === false ? <VideoOff size={18} /> : <VideoIcon size={18} />}
            </button>

            {/* Raise Hand Toggle */}
            <button
              onClick={raiseHandSelf}
              className={`p-3.5 rounded-full transition-all flex items-center gap-2 font-medium text-xs border ${
                self?.handRaised
                  ? 'bg-amber-500 text-black border-amber-600 shadow-md font-bold'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-fg)] border-[var(--color-border)] hover:bg-[var(--color-surface)]'
              }`}
              title={self?.handRaised ? 'Lower hand' : 'Raise hand'}
            >
              <Hand size={18} />
            </button>

            {/* Reactions button */}
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
              title="Leave video room"
            >
              <PhoneOff size={18} />
            </button>
          </div>

          {/* Right Drawers */}
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

function VideoCard({
  participant,
  isPrimary,
  color,
  onSelect,
}: {
  participant: Participant
  isPrimary?: boolean
  color: string
  onSelect?: () => void
}) {
  const isSpeaking = participant.presenceState === 'speaking'

  return (
    <div
      onClick={onSelect}
      className={`relative w-full h-full min-h-[140px] rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col items-center justify-center bg-[var(--color-surface-2)] shadow-lg group ${
        isSpeaking
          ? 'ring-2 ring-emerald-400 border-emerald-400 shadow-emerald-500/10'
          : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
      }`}
    >
      {/* Background simulated camera stream with ambient wave gradient */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${color}44 0%, transparent 80%)`,
        }}
      />

      {/* Center avatar or simulated video stream */}
      <div className="relative z-10 flex flex-col items-center">
        <div
          className={`rounded-full flex items-center justify-center font-bold text-2xl shadow-inner transition-transform duration-300 ${
            isPrimary ? 'w-28 h-28 text-3xl' : 'w-16 h-16 sm:w-20 sm:h-20 text-xl'
          } ${isSpeaking ? 'scale-105 ring-4 ring-emerald-400/40' : ''}`}
          style={{
            backgroundColor: `${color}25`,
            color: color,
            border: `2px solid ${color}66`,
          }}
        >
          {participant.initials}
        </div>

        {/* Transient emoji popover */}
        <AnimatePresence>
          {participant.reactionEmoji && (
            <motion.div
              initial={{ y: 5, opacity: 0, scale: 0.5 }}
              animate={{ y: -35, opacity: 1, scale: 1.4 }}
              exit={{ opacity: 0, y: -50 }}
              className="absolute -top-4 text-3xl filter drop-shadow"
            >
              {participant.reactionEmoji}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Top badges: Hand raised */}
      {participant.handRaised && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500 text-black text-xs font-bold shadow-md">
          <Hand size={12} />
          <span>Hand</span>
        </div>
      )}

      {/* Bottom overlay: Name & Audio status */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-medium">
          <span>{participant.name}</span>
          {participant.isSelf && (
            <span className="text-[9px] px-1 rounded bg-white/20 font-mono">YOU</span>
          )}
        </div>

        <div className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white">
          {participant.isMuted ? (
            <MicOff size={13} className="text-red-400" />
          ) : isSpeaking ? (
            <div className="flex items-center gap-1 text-emerald-400 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE</span>
            </div>
          ) : (
            <Mic size={13} className="text-white/70" />
          )}
        </div>
      </div>
    </div>
  )
}
