import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Bookmark, Compass, Radio, Check, MessageSquare, Mic, Video } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { avatarColor } from '@/components/ui/AvatarCluster'

const ROOM_TYPE_ICONS = { text: MessageSquare, audio: Mic, video: Video }
const ROOM_TYPE_COLORS = {
  text: 'var(--color-text-room)',
  audio: 'var(--color-audio-room)',
  video: 'var(--color-video-room)',
}

export default function SummaryPage() {
  const navigate = useNavigate()
  const room = useAppStore((s) => s.activeRoom)
  const saveMoment = useAppStore((s) => s.saveMoment)
  const resetJourney = useAppStore((s) => s.resetJourney)
  const [saved, setSaved] = useState(false)

  if (!room) {
    navigate('/rooms')
    return null
  }

  const perspectiveCount = Math.max(1, new Set(room.connections.map((c) => c.relationship)).size)
  const Icon = ROOM_TYPE_ICONS[room.type]
  const typeColor = ROOM_TYPE_COLORS[room.type]

  function handleSave() {
    saveMoment()
    setSaved(true)
  }

  function goDiscover() {
    resetJourney()
    navigate('/rooms')
  }

  function goBroadcastAnother() {
    resetJourney()
    navigate('/intent')
  }

  // mini constellation: deterministic scatter of dots representing thoughts
  const dots = room.thoughts.map((t, i) => {
    const angle = (i / room.thoughts.length) * Math.PI * 2
    return {
      id: t.id,
      x: 50 + Math.cos(angle) * 34,
      y: 50 + Math.sin(angle) * 34,
      seed: room.participants.find((p) => p.id === t.authorId)?.colorSeed ?? 0,
    }
  })

  return (
    <div className="min-h-screen px-6 md:px-10 py-16 flex items-center"
      style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-3xl mx-auto w-full">
        {/* Room type label */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mb-4"
        >
          <Icon size={14} style={{ color: typeColor }} strokeWidth={1.5} />
          <span className="font-mono text-xs uppercase tracking-widest"
            style={{ color: typeColor }}>
            Moment summary
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="font-display text-4xl md:text-6xl font-semibold text-center mb-14"
          style={{ color: 'var(--color-fg)' }}
        >
          {room.topicLabel}
        </motion.h1>

        <div className="grid md:grid-cols-2 gap-10 items-center mb-14">
          {/* mini constellation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative aspect-square rounded-2xl border dot-grid"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
              {room.connections.map((c) => {
                const from = dots.find((d) => d.id === c.fromThoughtId)
                const to = dots.find((d) => d.id === c.toThoughtId)
                if (!from || !to) return null
                return (
                  <line
                    key={c.id}
                    x1={`${from.x}%`}
                    y1={`${from.y}%`}
                    x2={`${to.x}%`}
                    y2={`${to.y}%`}
                    stroke={typeColor}
                    strokeWidth={1}
                    opacity={0.4}
                    strokeDasharray="4 4"
                  />
                )
              })}
            </svg>
            {dots.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.06, type: 'spring' }}
                className="absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${d.x}%`, top: `${d.y}%`, background: avatarColor(d.seed) }}
              />
            ))}
          </motion.div>

          {/* stats */}
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: 'minds gathered', value: room.participants.length },
              { label: 'thoughts shared', value: room.thoughts.length },
              { label: 'connections formed', value: room.connections.length },
              { label: 'perspectives emerged', value: perspectiveCount },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
                className="p-4 rounded-2xl border"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <div className="font-display text-3xl font-semibold"
                  style={{ color: 'var(--color-fg)' }}>
                  {stat.value}
                </div>
                <div className="text-[11px] font-mono uppercase tracking-wide mt-1"
                  style={{ color: 'var(--color-muted)' }}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleSave}
            disabled={saved}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-60"
            style={{
              background: saved ? 'var(--color-surface-2)' : 'var(--color-signal)',
              color: saved ? 'var(--color-muted)' : 'white',
              border: saved ? '1px solid var(--color-border)' : 'none',
            }}
          >
            {saved ? <Check size={16} /> : <Bookmark size={16} />}
            {saved ? 'Moment saved' : 'Save moment'}
          </button>
          <button
            onClick={goDiscover}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium border transition-all"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)', background: 'var(--color-surface)' }}
          >
            <Compass size={16} />
            Explore more
          </button>
          <button
            onClick={goBroadcastAnother}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium border transition-all"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)', background: 'var(--color-surface)' }}
          >
            <Radio size={16} />
            New thought
          </button>
        </div>
      </div>
    </div>
  )
}
