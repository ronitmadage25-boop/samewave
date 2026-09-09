import { motion } from 'framer-motion'
import type { Participant } from '@/types'
import { avatarColor } from '@/components/ui/AvatarCluster'

function WaveformBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[2px] h-5" aria-hidden="true">
      {[3, 7, 5, 9, 6, 4, 8, 5, 7, 4].map((h, i) => (
        <div
          key={i}
          className={active ? 'animate-wave-bar' : ''}
          style={{
            width: 2,
            height: active ? `${h}px` : '3px',
            background: 'var(--color-audio-room)',
            borderRadius: 1,
            opacity: active ? 0.9 : 0.3,
            '--duration': `${0.6 + (i % 4) * 0.15}s`,
            '--delay': `${i * 0.08}s`,
            transition: 'height 0.2s ease',
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

export function AudioPresence({ participants }: { participants: Participant[] }) {
  // Simulate speaking state: first 1-2 participants are "speaking"
  const speakingIds = new Set(
    participants.filter((_, i) => i % 4 === 0 || i % 7 === 0).map(p => p.id)
  )

  return (
    <div className="border-b px-4 md:px-6 py-4"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      <div className="flex items-center gap-1 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: 'var(--color-audio-room)' }} />
          <span className="relative inline-flex rounded-full h-2 w-2"
            style={{ background: 'var(--color-audio-room)' }} />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest ml-1"
          style={{ color: 'var(--color-audio-room)' }}>
          Audio room — {participants.length} present
        </span>
      </div>
      <div className="flex items-end gap-4 overflow-x-auto thin-scroll pb-1">
        {participants.map((p, i) => {
          const isSpeaking = speakingIds.has(p.id)
          const color = avatarColor(p.colorSeed)
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
              className="flex flex-col items-center gap-2 shrink-0"
            >
              <div className="relative">
                {isSpeaking && (
                  <motion.div
                    className="absolute -inset-1 rounded-full"
                    style={{ background: color, opacity: 0.2 }}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                )}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold relative"
                  style={{
                    background: color,
                    color: 'white',
                    border: isSpeaking ? `2px solid ${color}` : '2px solid transparent',
                    boxShadow: isSpeaking ? `0 0 12px ${color}60` : 'none',
                  }}
                >
                  {p.initials.slice(0, 2)}
                </div>
              </div>
              <WaveformBars active={isSpeaking} />
              <span className="text-[10px] font-medium text-center max-w-[52px] truncate"
                style={{ color: isSpeaking ? 'var(--color-fg)' : 'var(--color-muted)' }}>
                {p.isSelf ? 'You' : p.name}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
