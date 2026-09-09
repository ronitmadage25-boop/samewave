import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Network, Palette, Sparkles } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useSimulation } from '@/store/useSimulation'
import { RoomHeader } from '@/features/room/RoomHeader'
import { StageBar } from '@/features/room/StageBar'
import { PresenceStrip } from '@/features/room/PresenceStrip'
import { ThoughtsPanel } from '@/features/room/ThoughtsPanel'
import { ThoughtGraph } from '@/features/room/ThoughtGraph'
import { RoomEnding } from '@/features/room/RoomEnding'
import { Whiteboard } from '@/features/room/Whiteboard'
import { AudioRoomLayout } from '@/features/room/AudioRoomLayout'
import { VideoRoomLayout } from '@/features/room/VideoRoomLayout'

type ViewMode = 'thoughts' | 'graph' | 'whiteboard'

const ROOM_TYPE_COLORS = {
  text: 'var(--color-text-room)',
  audio: 'var(--color-audio-room)',
  video: 'var(--color-video-room)',
}

export default function RoomPage() {
  const navigate = useNavigate()
  const room = useAppStore((s) => s.activeRoom)
  const setRoomStage = useAppStore((s) => s.setRoomStage)
  const leaveRoom = useAppStore((s) => s.leaveRoom)
  const endRoom = useAppStore((s) => s.endRoom)
  const [mode, setMode] = useState<ViewMode>('thoughts')
  const [showEnding, setShowEnding] = useState(false)

  // Start ambient social simulation while room is active
  useSimulation(!!room && !showEnding)

  if (!room) {
    navigate('/rooms')
    return null
  }

  const typeColor = ROOM_TYPE_COLORS[room.type]
  const hasWhiteboard = room.tools?.includes('whiteboard') !== false
  const hasGraph = room.tools?.includes('thought-graph') !== false

  function handleLeave() {
    leaveRoom()
    if (room!.stage === 'wrap') {
      setShowEnding(true)
    } else {
      navigate('/rooms')
    }
  }

  function handleWrapNow() {
    endRoom()
    setShowEnding(true)
  }

  if (showEnding) {
    return <RoomEnding room={room} onContinue={() => navigate('/summary')} />
  }

  // Audio Room Layout
  if (room.type === 'audio') {
    return (
      <div className="h-screen flex flex-col bg-[var(--color-bg)]">
        <div className="h-0.5 w-full bg-[var(--color-audio-room)]" />
        <RoomHeader room={room} onLeave={handleLeave} />
        <StageBar stage={room.stage} onSelect={setRoomStage} />
        <AudioRoomLayout room={room} onLeave={handleLeave} />
      </div>
    )
  }

  // Video Room Layout
  if (room.type === 'video') {
    return (
      <div className="h-screen flex flex-col bg-[var(--color-bg)]">
        <div className="h-0.5 w-full bg-[var(--color-video-room)]" />
        <RoomHeader room={room} onLeave={handleLeave} />
        <StageBar stage={room.stage} onSelect={setRoomStage} />
        <VideoRoomLayout room={room} onLeave={handleLeave} />
      </div>
    )
  }

  // Text Room Layout
  const VIEW_OPTIONS = [
    { id: 'thoughts' as ViewMode, icon: MessageSquare, label: 'Thoughts', always: true },
    { id: 'graph' as ViewMode, icon: Network, label: 'Graph', always: hasGraph },
    { id: 'whiteboard' as ViewMode, icon: Palette, label: 'Canvas', always: hasWhiteboard },
  ].filter((v) => v.always)

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)]">
      {/* Room type accent bar */}
      <div className="h-0.5 w-full" style={{ background: typeColor }} />

      <RoomHeader room={room} onLeave={handleLeave} />
      <StageBar stage={room.stage} onSelect={setRoomStage} />

      {/* Participant Presence Strip */}
      <PresenceStrip participants={room.participants} />

      {/* View Mode Bar + Wrap Button */}
      <div className="flex items-center justify-between px-4 md:px-6 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]/40">
        <div className="flex items-center gap-1 border border-[var(--color-border)] rounded-xl p-0.5 bg-[var(--color-surface)] shadow-xs">
          {VIEW_OPTIONS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: mode === id ? 'var(--color-surface-2)' : 'transparent',
                color: mode === id ? 'var(--color-fg)' : 'var(--color-muted)',
              }}
            >
              <Icon size={13} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {room.stage === 'wrap' ? (
            <button
              onClick={handleWrapNow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity bg-[var(--color-signal)] text-white"
            >
              <Sparkles size={13} />
              Wrap & Save Moment
            </button>
          ) : (
            <button
              onClick={() => setRoomStage('wrap')}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)] px-2 py-1"
            >
              Move to wrap stage
            </button>
          )}
        </div>
      </div>

      {/* Active Workspace View */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {mode === 'thoughts' ? (
            <motion.div
              key="thoughts"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <ThoughtsPanel room={room} />
            </motion.div>
          ) : mode === 'graph' ? (
            <motion.div
              key="graph"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <ThoughtGraph room={room} />
            </motion.div>
          ) : (
            <motion.div
              key="whiteboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <Whiteboard />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
