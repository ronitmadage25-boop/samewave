import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Video, VideoOff, Hand, PhoneOff,
  Sparkles, MessageSquare, AlertTriangle, Loader2
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useWebRTC } from '@/hooks/useWebRTC'
import type { Room } from '@/types'
import { ThoughtsPanel } from './ThoughtsPanel'

const PALETTE_COLORS = [
  '#E8542A', '#4A7FA5', '#7C4AB5', '#2E7D5E', '#E5A93C', '#E24A8D'
]

interface VideoRoomLayoutProps {
  room: Room
  onLeave: () => void
  onPresenceUpdate?: (updates: {
    isMuted?: boolean
    hasVideo?: boolean
    handRaised?: boolean
    presenceState?: string
  }) => void
}

/** Local video tile — shows actual camera feed */
function LocalVideoTile({ stream, isMuted, isCameraOn, name, initials, avatarUrl, isSpeaking, colorSeed }: {
  stream: MediaStream | null
  isMuted: boolean
  isCameraOn: boolean
  name: string
  initials: string
  avatarUrl?: string | null
  isSpeaking: boolean
  colorSeed: number
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const color = PALETTE_COLORS[colorSeed % PALETTE_COLORS.length]

  useEffect(() => {
    if (videoRef.current && stream && isCameraOn) {
      videoRef.current.srcObject = stream
    } else if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [stream, isCameraOn])

  return (
    <div className="relative rounded-2xl overflow-hidden aspect-video bg-[var(--color-surface-2)]"
      style={{ border: isSpeaking ? `2px solid ${color}` : '2px solid var(--color-border)' }}>
      {/* Camera feed */}
      {isCameraOn && stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-16 h-16 rounded-full object-cover opacity-70" />
          ) : (
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ background: color, color: 'white', opacity: 0.8 }}>
              {initials.slice(0, 2)}
            </div>
          )}
          {!isCameraOn && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-widest"
              style={{ color: 'var(--color-muted)' }}>
              Camera off
            </div>
          )}
        </div>
      )}

      {/* Overlay controls */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {isMuted && (
          <div className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }}>
            <MicOff size={11} className="text-white/70" />
          </div>
        )}
      </div>

      {/* Name label */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
          You
        </span>
        {isSpeaking && !isMuted && (
          <div className="flex items-center gap-[2px]">
            {[3, 5, 4, 6, 4].map((h, i) => (
              <div key={i} className="animate-wave-bar rounded-full"
                style={{
                  width: 2,
                  height: `${h}px`,
                  background: color,
                  '--duration': `${0.6 + i * 0.1}s`,
                  '--delay': `${i * 0.08}s`,
                } as React.CSSProperties} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Remote video tile — shows WebRTC stream from another participant */
function RemoteVideoTile({ stream, name, initials, avatarUrl, isMuted, isSpeaking, colorSeed, handRaised }: {
  stream: MediaStream | null
  name: string
  initials: string
  avatarUrl?: string | null
  isMuted?: boolean
  isSpeaking: boolean
  colorSeed: number
  handRaised?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const color = PALETTE_COLORS[colorSeed % PALETTE_COLORS.length]
  const hasVideoTrack = stream?.getVideoTracks().some(t => t.enabled && t.readyState === 'live')

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className="relative rounded-2xl overflow-hidden aspect-video bg-[var(--color-surface-2)]"
      style={{ border: isSpeaking ? `2px solid ${color}` : '2px solid var(--color-border)' }}>
      {/* Video feed or avatar placeholder */}
      {stream && hasVideoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-16 h-16 rounded-full object-cover opacity-70" />
          ) : (
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ background: color, color: 'white' }}>
              {initials.slice(0, 2)}
            </div>
          )}
        </div>
      )}

      {/* Status overlays */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {isMuted && (
          <div className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }}>
            <MicOff size={11} className="text-white/70" />
          </div>
        )}
        {handRaised && (
          <span className="text-base">✋</span>
        )}
      </div>

      {/* Name */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
          {name}
        </span>
        {isSpeaking && !isMuted && (
          <div className="flex items-center gap-[2px]">
            {[3, 5, 4, 6, 4].map((h, i) => (
              <div key={i} className="animate-wave-bar rounded-full"
                style={{
                  width: 2,
                  height: `${h}px`,
                  background: color,
                  '--duration': `${0.6 + i * 0.1}s`,
                  '--delay': `${i * 0.08}s`,
                } as React.CSSProperties} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function VideoRoomLayout({ room, onLeave, onPresenceUpdate }: VideoRoomLayoutProps) {
  const raiseHandSelf = useAppStore((s) => s.raiseHandSelf)
  const setParticipantReactionEmoji = useAppStore((s) => s.setParticipantReactionEmoji)
  const user = useAppStore((s) => s.user)
  const profile = useAppStore((s) => s.profile)

  const [showThoughts, setShowThoughts] = useState(false)
  const [showReactions, setShowReactions] = useState(false)

  const self = room.participants.find((p) => p.isSelf)

  // Real WebRTC audio + video
  const {
    localStream,
    remoteStreams,
    isMuted,
    isCameraOn,
    micPermission,
    cameraPermission,
    toggleMic,
    toggleCamera,
    isSpeaking,
    cleanup,
  } = useWebRTC({
    roomId: room.id,
    mode: 'video',
    enabled: true,
  })

  // Sync state to presence
  useEffect(() => {
    onPresenceUpdate?.({ isMuted, hasVideo: isCameraOn })
  }, [isMuted, isCameraOn])

  // Sync speaking to store
  useEffect(() => {
    if (user) {
      useAppStore.getState().setParticipantSpeaking(user.id, isSpeaking)
    }
  }, [isSpeaking, user?.id])

  useEffect(() => {
    return () => { cleanup() }
  }, [cleanup])

  function handleRaiseHand() {
    raiseHandSelf()
    onPresenceUpdate?.({ handRaised: !self?.handRaised })
  }

  function handleQuickReact(emoji: string) {
    if (self) {
      setParticipantReactionEmoji(self.id, emoji)
      setShowReactions(false)
      setTimeout(() => { setParticipantReactionEmoji(self.id, undefined) }, 3500)
    }
  }

  function handleLeave() {
    cleanup()
    onLeave()
  }

  const QUICK_REACTIONS = ['✨', '💡', '🔥', '👏', '🤔', '💯']
  const remoteParticipants = room.participants.filter(p => !p.isSelf)

  const permissionError = micPermission === 'denied' || cameraPermission === 'denied'
  const permissionUnavailable = micPermission === 'unavailable' || cameraPermission === 'unavailable'

  return (
    <div className="flex-1 flex overflow-hidden bg-[var(--color-bg)]">
      {/* Main Video Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Permission warning */}
        {(permissionError || permissionUnavailable) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-6 py-3 border-b text-xs"
            style={{ background: 'var(--color-signal-soft)', borderColor: 'var(--color-signal)', color: 'var(--color-signal)' }}
          >
            <AlertTriangle size={14} className="shrink-0" />
            <span>
              {micPermission === 'denied' || cameraPermission === 'denied'
                ? 'Camera/microphone access denied. Allow permissions in browser settings.'
                : 'No camera or microphone detected on this device.'}
            </span>
          </motion.div>
        )}

        {/* Video tiles */}
        <div className="flex-1 p-4 overflow-auto">
          <div className={`h-full grid gap-3 ${
            remoteParticipants.length === 0 ? 'grid-cols-1 max-w-2xl mx-auto' :
            remoteParticipants.length === 1 ? 'grid-cols-1 md:grid-cols-2' :
            remoteParticipants.length <= 3 ? 'grid-cols-2 md:grid-cols-2' :
            'grid-cols-2 md:grid-cols-3'
          } items-start content-start`}>
            {/* Local (self) video tile */}
            <LocalVideoTile
              stream={localStream}
              isMuted={isMuted}
              isCameraOn={isCameraOn}
              name={profile?.displayName ?? 'You'}
              initials={profile?.initials ?? 'Y'}
              avatarUrl={profile?.avatarUrl}
              isSpeaking={isSpeaking}
              colorSeed={user?.id.charCodeAt(0) ?? 0}
            />

            {/* Remote participant tiles */}
            {remoteParticipants.map((p) => (
              <RemoteVideoTile
                key={p.id}
                stream={remoteStreams.get(p.id) ?? null}
                name={p.name}
                initials={p.initials}
                avatarUrl={p.avatarUrl}
                isMuted={p.isMuted}
                isSpeaking={p.presenceState === 'speaking'}
                colorSeed={p.colorSeed}
                handRaised={p.handRaised}
              />
            ))}

            {/* Empty placeholder if only self */}
            {remoteParticipants.length === 0 && (
              <div className="aspect-video rounded-2xl border border-dashed flex flex-col items-center justify-center gap-3"
                style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-xs font-mono uppercase tracking-widest"
                  style={{ color: 'var(--color-muted)' }}>
                  Waiting for others to join…
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Control Bar */}
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)]/80 px-6 py-4">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {/* Mic */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={toggleMic}
              disabled={micPermission === 'denied' || micPermission === 'unavailable'}
              className="flex flex-col items-center gap-1.5 disabled:opacity-40"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: !isMuted ? 'var(--color-audio-room)' : 'var(--color-surface-2)',
                  border: `2px solid ${!isMuted ? 'var(--color-audio-room)' : 'var(--color-border)'}`,
                }}>
                {micPermission === 'requesting' ? (
                  <Loader2 size={18} className="animate-spin text-white" />
                ) : isMuted ? (
                  <MicOff size={18} className="text-[var(--color-muted)]" />
                ) : (
                  <Mic size={18} className="text-white" />
                )}
              </div>
              <span className="text-[9px] font-mono uppercase tracking-widest"
                style={{ color: 'var(--color-muted)' }}>
                {isMuted ? 'Muted' : 'Live'}
              </span>
            </motion.button>

            {/* Camera */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={toggleCamera}
              disabled={cameraPermission === 'denied' || cameraPermission === 'unavailable'}
              className="flex flex-col items-center gap-1.5 disabled:opacity-40"
              aria-label={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: isCameraOn ? 'var(--color-video-room)' : 'var(--color-surface-2)',
                  border: `2px solid ${isCameraOn ? 'var(--color-video-room)' : 'var(--color-border)'}`,
                }}>
                {cameraPermission === 'requesting' ? (
                  <Loader2 size={18} className="animate-spin text-white" />
                ) : isCameraOn ? (
                  <Video size={18} className="text-white" />
                ) : (
                  <VideoOff size={18} className="text-[var(--color-muted)]" />
                )}
              </div>
              <span className="text-[9px] font-mono uppercase tracking-widest"
                style={{ color: 'var(--color-muted)' }}>
                {isCameraOn ? 'Camera On' : 'Camera Off'}
              </span>
            </motion.button>

            {/* Raise Hand */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleRaiseHand}
              className="flex flex-col items-center gap-1.5"
              aria-label={self?.handRaised ? 'Lower hand' : 'Raise hand'}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: self?.handRaised ? 'rgba(245, 158, 11, 0.2)' : 'var(--color-surface-2)',
                  border: `2px solid ${self?.handRaised ? 'rgb(245, 158, 11)' : 'var(--color-border)'}`,
                }}>
                <Hand size={18} style={{ color: self?.handRaised ? 'rgb(245, 158, 11)' : 'var(--color-muted)' }} />
              </div>
              <span className="text-[9px] font-mono uppercase tracking-widest"
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
                <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                  style={{ background: 'var(--color-surface-2)', border: '2px solid var(--color-border)' }}>
                  <Sparkles size={18} style={{ color: 'var(--color-muted)' }} />
                </div>
                <span className="text-[9px] font-mono uppercase tracking-widest"
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

            {/* Toggle thoughts */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowThoughts(!showThoughts)}
              className="flex flex-col items-center gap-1.5"
              aria-label="Toggle thoughts panel"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: showThoughts ? 'var(--color-text-room-soft)' : 'var(--color-surface-2)',
                  border: `2px solid ${showThoughts ? 'var(--color-text-room)' : 'var(--color-border)'}`,
                }}>
                <MessageSquare size={18}
                  style={{ color: showThoughts ? 'var(--color-text-room)' : 'var(--color-muted)' }} />
              </div>
              <span className="text-[9px] font-mono uppercase tracking-widest"
                style={{ color: 'var(--color-muted)' }}>Thoughts</span>
            </motion.button>

            {/* Leave */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleLeave}
              className="flex flex-col items-center gap-1.5"
              aria-label="Leave room"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                style={{ background: 'rgba(196, 57, 47, 0.15)', border: '2px solid rgba(196, 57, 47, 0.4)' }}>
                <PhoneOff size={18} style={{ color: '#C4392F' }} />
              </div>
              <span className="text-[9px] font-mono uppercase tracking-widest"
                style={{ color: 'var(--color-muted)' }}>Leave</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Side thoughts panel */}
      <AnimatePresence>
        {showThoughts && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="hidden md:flex flex-col border-l border-[var(--color-border)] overflow-hidden"
            style={{ background: 'var(--color-surface)' }}
          >
            <ThoughtsPanel room={room} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
