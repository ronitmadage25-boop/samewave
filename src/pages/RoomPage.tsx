import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Video, VideoOff, Hand, PhoneOff,
  Sparkles, MessageSquare, QrCode, Copy, Check,
  ArrowLeft, AlertCircle, Radio, Users, Send, Smile,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { signInWithGoogle } from '@/services/auth'
import { useEphemeralRoom } from '@/hooks/useEphemeralRoom'
import { InviteModal } from '@/components/room/InviteModal'
import type { RoomType } from '@/types'

const PALETTE = [
  '#E8542A', '#4A7FA5', '#7C4AB5', '#2E7D5E', '#E5A93C', '#E24A8D',
  '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1', '#D81B60',
]

/**
 * LocalVideoTile — renders the user's actual camera feed
 */
function LocalVideoTile({
  stream,
  isMuted,
  isCameraOn,
  isSpeaking,
  name,
  initials,
  colorSeed,
}: {
  stream: MediaStream | null
  isMuted: boolean
  isCameraOn: boolean
  isSpeaking: boolean
  name: string
  initials: string
  colorSeed: number
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const color = PALETTE[colorSeed % PALETTE.length]

  useEffect(() => {
    if (videoRef.current && stream && isCameraOn) {
      videoRef.current.srcObject = stream
    } else if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [stream, isCameraOn])

  return (
    <div
      className="relative rounded-2xl overflow-hidden aspect-video bg-[#12121A] flex items-center justify-center transition-all duration-200"
      style={{
        border: isSpeaking ? `2px solid ${color}` : '2px solid rgba(255, 255, 255, 0.08)',
        boxShadow: isSpeaking ? `0 0 20px ${color}33` : 'none',
      }}
    >
      {isCameraOn && stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg"
            style={{ background: color, color: '#FFFFFF' }}
          >
            {initials.slice(0, 2)}
          </div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#8A8680]">
            Camera Off
          </span>
        </div>
      )}

      {/* Mic Status Badge */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
        <div
          className={`px-2 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 backdrop-blur-md ${
            isMuted ? 'bg-red-500/80 text-white' : 'bg-black/50 text-white/90'
          }`}
        >
          {isMuted ? <MicOff size={12} /> : <Mic size={12} />}
          <span>{isMuted ? 'Muted' : 'Live'}</span>
        </div>
      </div>

      {/* Name Label */}
      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2">
        <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5">
          <span>{name}</span>
          <span className="text-[10px] opacity-75 font-normal">(You)</span>
        </div>
        {isSpeaking && !isMuted && (
          <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
        )}
      </div>
    </div>
  )
}

/**
 * RemoteVideoTile — renders a peer's actual WebRTC stream
 */
function RemoteVideoTile({
  stream,
  name,
  initials,
  colorSeed,
  isMuted,
  hasVideo,
  handRaised,
}: {
  stream?: MediaStream
  name: string
  initials: string
  colorSeed: number
  isMuted?: boolean
  hasVideo?: boolean
  handRaised?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const color = PALETTE[colorSeed % PALETTE.length]
  const hasActiveVideoTrack = stream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div
      className="relative rounded-2xl overflow-hidden aspect-video bg-[#12121A] flex items-center justify-center transition-all duration-200 border border-white/10"
    >
      {stream && hasActiveVideoTrack && hasVideo !== false ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2">
          {/* Fallback audio element so remote voice plays even if video is off */}
          {stream && (
            <audio
              ref={(el) => {
                if (el && stream) el.srcObject = stream
              }}
              autoPlay
            />
          )}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg"
            style={{ background: color, color: '#FFFFFF' }}
          >
            {initials.slice(0, 2)}
          </div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#8A8680]">
            {hasVideo === false ? 'Camera Off' : 'Connecting Audio…'}
          </span>
        </div>
      )}

      {/* Badges */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
        {handRaised && (
          <div className="px-2 py-1 rounded-full bg-amber-500 text-black text-xs font-bold flex items-center gap-1 shadow-lg animate-bounce">
            <span>✋ Raised</span>
          </div>
        )}
        <div
          className={`px-2 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 backdrop-blur-md ${
            isMuted ? 'bg-red-500/80 text-white' : 'bg-black/50 text-white/90'
          }`}
        >
          {isMuted ? <MicOff size={12} /> : <Mic size={12} />}
          <span>{isMuted ? 'Muted' : 'Audio On'}</span>
        </div>
      </div>

      {/* Name Label */}
      <div className="absolute bottom-2.5 left-2.5">
        <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold">
          {name}
        </div>
      </div>
    </div>
  )
}

export default function RoomPage() {
  const navigate = useNavigate()
  const { roomId } = useParams<{ roomId?: string }>()
  const [searchParams] = useSearchParams()

  const roomType = (searchParams.get('type') as RoomType) || 'video'
  const roomTitle = searchParams.get('title') || 'Wavelength Space'
  const roomCategory = (searchParams.get('category') as import('@/types').Category) || 'Tech'

  const user = useAppStore((s) => s.user)
  const profile = useAppStore((s) => s.profile)

  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [thoughtsDrawerOpen, setThoughtsDrawerOpen] = useState(false)
  const [thoughtDraft, setThoughtDraft] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Initialize the ephemeral room hook
  const {
    localStream,
    remoteStreams,
    isMuted,
    isCameraOn,
    isSpeaking,
    handRaised,
    toggleMic,
    toggleCamera,
    toggleHand,
    participants,
    thoughts,
    floatingReactions,
    sendThought,
    sendReaction,
    connectionStatus,
    hasEnded,
    endRoom,
  } = useEphemeralRoom({
    roomId,
    roomType,
    roomTitle,
    roomCategory,
    enabled: Boolean(user && roomId),
  })

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/room/${roomId}?type=${roomType}&title=${encodeURIComponent(roomTitle)}&category=${encodeURIComponent(roomCategory)}`
    : `https://samewave-kappa.vercel.app/room/${roomId}`

  function handleCopyInvite() {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }

  async function handleGoogleLogin() {
    setAuthError(null)
    const { error } = await signInWithGoogle()
    if (error) {
      setAuthError(error.message)
    }
  }

  function handleLeave() {
    if (participants.length <= 1) {
      endRoom()
    }
    navigate('/rooms')
  }

  function handlePostThought(e: React.FormEvent) {
    e.preventDefault()
    if (!thoughtDraft.trim()) return
    sendThought(thoughtDraft.trim(), 'thought')
    setThoughtDraft('')
  }

  // ── 1. AUTHENTICATION GATE (When visitor opens copied link on mobile/desktop)
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-[#F0EEE8] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--color-signal)]/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-md bg-[#12121A] border border-white/10 rounded-3xl p-8 shadow-2xl text-center space-y-6 z-10"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-signal)] text-white shadow-lg shadow-[var(--color-signal)]/30 mx-auto">
            <Radio size={28} />
          </div>

          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--color-signal)] font-bold">
              Ephemeral Wavelength
            </span>
            <h2 className="font-display text-2xl font-bold mt-1 text-[#F0EEE8]">
              {roomTitle}
            </h2>
            <p className="text-xs text-[#8A8680] mt-2 leading-relaxed">
              You are invited to a temporary, peer-to-peer audio/video space. Sign in with Google to enter.
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 text-left">
              <AlertCircle size={16} className="shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-white text-gray-900 font-semibold text-sm hover:bg-gray-100 active:scale-[0.99] transition-all shadow-md"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>
        </motion.div>
      </div>
    )
  }

  // ── 2. ENDED ROOM STATE
  if (hasEnded) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-[#F0EEE8] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-[var(--color-signal)]">
          <Radio size={28} />
        </div>
        <h2 className="text-xl font-bold font-display mb-2">This wavelength has ended</h2>
        <p className="text-sm text-[#8A8680] max-w-sm mb-6">
          The participants have wrapped up this temporary space. Discover active live wavelengths or start a new one.
        </p>
        <button
          onClick={() => navigate('/rooms')}
          className="px-6 py-3 rounded-xl bg-[var(--color-signal)] text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg"
        >
          Discover live wavelengths
        </button>
      </div>
    )
  }

  // ── 3. CONNECTION ERROR STATE (No blank black screen)
  if (connectionStatus === 'error') {
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-[#F0EEE8] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-400">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-xl font-bold font-display mb-2">Wavelength unavailable</h2>
        <p className="text-sm text-[#8A8680] max-w-sm mb-2">
          Unable to establish a realtime connection for this space.
        </p>
        <p className="text-xs font-mono text-red-400/80 mb-6">
          Realtime signal timed out or channel connection failed.
        </p>
        <button
          onClick={() => navigate('/rooms')}
          className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm active:scale-95 transition-all border border-white/10"
        >
          Back to live wavelengths
        </button>
      </div>
    )
  }

  // ── 4. ACTIVE EPHEMERAL ROOM UI
  const remoteParticipants = participants.filter((p) => !p.isSelf)

  return (
    <div className="h-screen w-screen bg-[#0A0A0F] text-[#F0EEE8] flex flex-col overflow-hidden relative select-none">
      {/* ── TOP HEADER ──────────────────────────────────────────────────────── */}
      <header className="px-4 py-3 border-b border-white/10 bg-[#12121A]/90 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={handleLeave}
            className="p-2 rounded-xl text-[#8A8680] hover:text-white hover:bg-white/5 transition-colors shrink-0"
            title="Leave room"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-base font-semibold truncate text-[#F0EEE8]">
                {roomTitle}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-signal)]/15 text-[var(--color-signal)] text-[10px] font-mono font-medium uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-signal)] animate-ping" />
                Live Mesh
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#8A8680] truncate">
              Room: {roomId?.slice(0, 8)}… · {participants.length} present
            </p>
          </div>
        </div>

        {/* Action buttons: SHARE WAVELENGTH (Copy Link & QR) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyInvite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#F0EEE8] text-xs font-medium transition-colors border border-white/10"
            title="Copy invite link"
          >
            {copiedLink ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            <span className="hidden sm:inline">{copiedLink ? 'Copied Link' : 'Copy Link'}</span>
          </button>

          <button
            onClick={() => setInviteModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--color-signal)] text-white text-xs font-semibold hover:opacity-95 active:scale-95 transition-all shadow-md"
            title="Share Wavelength"
          >
            <QrCode size={14} />
            <span>SHARE WAVELENGTH</span>
          </button>
        </div>
      </header>

      {/* ── FLOATING REACTIONS LAYER ─────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {floatingReactions.map((rx) => (
          <motion.div
            key={rx.id}
            initial={{ opacity: 0, y: '80%', x: `${30 + (rx.colorSeed % 40)}%`, scale: 0.5 }}
            animate={{ opacity: [0, 1, 1, 0], y: '20%', scale: [0.5, 1.3, 1, 0.8] }}
            transition={{ duration: 3, ease: 'easeOut' }}
            className="absolute flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white text-sm shadow-xl"
          >
            <span className="text-2xl">{rx.emoji}</span>
            <span className="text-xs font-medium opacity-80">{rx.authorName}</span>
          </motion.div>
        ))}
      </div>

      {/* ── MAIN STAGE AREA ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden p-3 md:p-6 flex flex-col items-center justify-center relative">
        {roomType === 'video' ? (
          /* Video Room Layout */
          <div className="w-full h-full max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 items-center justify-center auto-rows-fr">
            {/* Local Video Tile */}
            <LocalVideoTile
              stream={localStream}
              isMuted={isMuted}
              isCameraOn={isCameraOn}
              isSpeaking={isSpeaking}
              name={profile?.displayName || 'You'}
              initials={profile?.initials || 'ME'}
              colorSeed={Math.abs(user.id.charCodeAt(0)) % 12}
            />

            {/* Remote Video Tiles or Waiting Card */}
            {remoteParticipants.length > 0 ? (
              remoteParticipants.map((peer) => (
                <RemoteVideoTile
                  key={peer.id}
                  stream={remoteStreams.get(peer.id)}
                  name={peer.name}
                  initials={peer.initials}
                  colorSeed={peer.colorSeed}
                  isMuted={peer.isMuted}
                  hasVideo={peer.hasVideo}
                  handRaised={peer.handRaised}
                />
              ))
            ) : (
              /* Waiting for second device */
              <div className="rounded-2xl border border-dashed border-white/20 bg-[#12121A]/50 aspect-video flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[var(--color-signal)] mb-3">
                  <Users size={24} />
                </div>
                <h3 className="text-sm font-semibold text-[#F0EEE8]">
                  Waiting for peers to join
                </h3>
                <p className="text-xs text-[#8A8680] max-w-xs mt-1 mb-4">
                  Open this room URL on your mobile phone or another browser window to connect live.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyInvite}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white transition-colors"
                  >
                    <Copy size={13} />
                    <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                  </button>
                  <button
                    onClick={() => setInviteModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-signal)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    <QrCode size={13} />
                    <span>Show QR</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Audio Room Layout */
          <div className="w-full h-full max-w-3xl mx-auto flex flex-col items-center justify-center space-y-8">
            {/* Audio Pulse Visualizer */}
            <div className="relative flex items-center justify-center">
              <motion.div
                animate={{
                  scale: isSpeaking ? [1, 1.25, 1.1] : 1,
                  opacity: isSpeaking ? [0.2, 0.4, 0.2] : 0.1,
                }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="w-48 h-48 rounded-full bg-[var(--color-signal)] absolute pointer-events-none"
              />
              <div className="w-32 h-32 rounded-full bg-[#12121A] border-2 border-[var(--color-signal)] flex items-center justify-center shadow-2xl z-10">
                <Radio size={40} className="text-[var(--color-signal)]" />
              </div>
            </div>

            {/* Participants Grid */}
            <div className="flex flex-wrap items-center justify-center gap-6">
              {/* Self */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-lg relative"
                  style={{ background: 'var(--color-signal)' }}
                >
                  {profile?.initials || 'ME'}
                  {isMuted && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white">
                      <MicOff size={10} />
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-white">{profile?.displayName} (You)</span>
              </div>

              {/* Remotes */}
              {remoteParticipants.map((peer) => {
                const stream = remoteStreams.get(peer.id)
                return (
                  <div key={peer.id} className="flex flex-col items-center gap-2">
                    {stream && (
                      <audio
                        ref={(el) => {
                          if (el && stream) el.srcObject = stream
                        }}
                        autoPlay
                      />
                    )}
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-lg relative"
                      style={{ background: PALETTE[peer.colorSeed % PALETTE.length] }}
                    >
                      {peer.initials}
                      {peer.isMuted && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white">
                          <MicOff size={10} />
                        </div>
                      )}
                      {peer.handRaised && (
                        <div className="absolute -bottom-1 -right-1 text-xs">✋</div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-white/90">{peer.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── EPHEMERAL THOUGHTS DRAWER (Responsive overlay) ───────────────────── */}
      <AnimatePresence>
        {thoughtsDrawerOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-14 right-0 bottom-20 w-full sm:w-80 bg-[#12121A]/95 backdrop-blur-xl border-l border-white/10 p-4 flex flex-col z-20 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--color-signal)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F0EEE8]">
                  Ephemeral Thoughts
                </h3>
              </div>
              <button
                onClick={() => setThoughtsDrawerOpen(false)}
                className="text-xs text-[#8A8680] hover:text-white"
              >
                Close
              </button>
            </div>

            {/* Thoughts list */}
            <div className="flex-1 overflow-y-auto space-y-2 py-3">
              {thoughts.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-center text-[#8A8680] text-xs">
                  <MessageSquare size={20} className="mb-2 opacity-50" />
                  <span>No thoughts shared yet</span>
                  <span className="text-[11px] mt-1">Drop an idea or perspective below</span>
                </div>
              ) : (
                thoughts.map((t) => (
                  <div key={t.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#8A8680]">
                      <span className="font-semibold text-white/80">{t.authorName}</span>
                      <span>{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-white/90 leading-relaxed">{t.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Composer */}
            <form onSubmit={handlePostThought} className="pt-2 flex items-center gap-2">
              <input
                value={thoughtDraft}
                onChange={(e) => setThoughtDraft(e.target.value)}
                placeholder="Share an insight…"
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-signal)]"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-[var(--color-signal)] text-white hover:opacity-90 active:scale-95 transition-all"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BOTTOM CONTROL BAR (Touch targets >= 44px) ───────────────────────── */}
      <footer className="h-20 border-t border-white/10 bg-[#12121A]/95 backdrop-blur-md px-4 flex items-center justify-center z-20">
        <div className="flex items-center gap-2 sm:gap-3 max-w-lg w-full justify-center">
          {/* Microphone */}
          <button
            onClick={toggleMic}
            className={`min-w-[48px] h-12 px-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs transition-all active:scale-95 ${
              isMuted
                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            <span className="hidden sm:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* Camera (if video room) */}
          {roomType === 'video' && (
            <button
              onClick={toggleCamera}
              className={`min-w-[48px] h-12 px-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs transition-all active:scale-95 ${
                !isCameraOn
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : 'bg-white/10 text-white hover:bg-white/15'
              }`}
              title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {!isCameraOn ? <VideoOff size={18} /> : <Video size={18} />}
              <span className="hidden sm:inline">{isCameraOn ? 'Cam On' : 'Cam Off'}</span>
            </button>
          )}

          {/* Raise Hand */}
          <button
            onClick={toggleHand}
            className={`min-w-[48px] h-12 px-3 rounded-2xl flex items-center justify-center gap-1.5 font-semibold text-xs transition-all active:scale-95 ${
              handRaised
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
            title={handRaised ? 'Lower Hand' : 'Raise Hand'}
          >
            <Hand size={18} />
            <span className="hidden sm:inline">{handRaised ? 'Raised' : 'Hand'}</span>
          </button>

          {/* Quick Reaction Emoji */}
          <div className="relative group">
            <button
              onClick={() => sendReaction('✨')}
              className="min-w-[48px] h-12 px-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white flex items-center justify-center text-xs font-semibold active:scale-95 transition-all"
              title="React"
            >
              <Smile size={18} />
            </button>

            {/* Quick emoji popover */}
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-1 p-1.5 rounded-2xl bg-[#1A1A26] border border-white/15 shadow-2xl backdrop-blur-md">
              {['✨', '💡', '🔥', '👏', '🤔', '❤️'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation()
                    sendReaction(emoji)
                  }}
                  className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-lg active:scale-90 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Thoughts Drawer Toggle */}
          <button
            onClick={() => setThoughtsDrawerOpen((prev) => !prev)}
            className={`min-w-[48px] h-12 px-3 rounded-2xl flex items-center justify-center gap-1.5 font-semibold text-xs transition-all active:scale-95 ${
              thoughtsDrawerOpen
                ? 'bg-[var(--color-signal)] text-white'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
            title="Thoughts stream"
          >
            <MessageSquare size={18} />
            {thoughts.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-mono">
                {thoughts.length}
              </span>
            )}
          </button>

          {/* Leave Session */}
          <button
            onClick={handleLeave}
            className="min-w-[48px] h-12 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md ml-auto sm:ml-0"
            title="Leave wavelength"
          >
            <PhoneOff size={18} />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </footer>

      {/* ── INVITE / QR CODE MODAL ───────────────────────────────────────────── */}
      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        url={inviteUrl}
        roomTitle={roomTitle}
      />
    </div>
  )
}
