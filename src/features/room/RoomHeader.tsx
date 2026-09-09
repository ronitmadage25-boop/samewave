import { useEffect, useState } from 'react'
import { ArrowLeft, MessageSquare, Mic, Video } from 'lucide-react'
import type { Room } from '@/types'
import { AvatarCluster } from '@/components/ui/AvatarCluster'

const ROOM_TYPE_ICONS = { text: MessageSquare, audio: Mic, video: Video }
const ROOM_TYPE_COLORS = {
  text: 'var(--color-text-room)',
  audio: 'var(--color-audio-room)',
  video: 'var(--color-video-room)',
}

export function RoomHeader({ room, onLeave }: { room: Room; onLeave: () => void }) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const elapsedMin = now === null ? 0 : Math.floor((now - room.startedAt) / 60000)
  const remaining = Math.max(0, room.durationMinutes - elapsedMin)
  const Icon = ROOM_TYPE_ICONS[room.type]
  const typeColor = ROOM_TYPE_COLORS[room.type]

  return (
    <header className="flex items-center justify-between gap-4 px-4 md:px-6 py-3 border-b"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onLeave} aria-label="Leave room"
          className="transition-colors shrink-0"
          style={{ color: 'var(--color-muted)' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${typeColor}15`, border: `1px solid ${typeColor}30` }}>
          <Icon size={15} style={{ color: typeColor }} strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-base md:text-lg font-semibold truncate"
            style={{ color: 'var(--color-fg)' }}>
            {room.topicLabel}
          </h1>
          <p className="text-[11px] font-mono" style={{ color: 'var(--color-muted)' }}>
            ~{remaining}m remaining
          </p>
        </div>
      </div>
      <AvatarCluster participants={room.participants} max={4} />
    </header>
  )
}
