import { motion } from 'framer-motion'
import { MicOff, VideoOff } from 'lucide-react'
import type { Participant } from '@/types'
import { avatarColor } from '@/components/ui/AvatarCluster'

export function VideoGrid({ participants }: { participants: Participant[] }) {
  // Simulate video off/muted states
  const muteIds = new Set(participants.filter((_, i) => i % 3 === 2).map(p => p.id))
  const videoOffIds = new Set(participants.filter((_, i) => i % 5 === 1).map(p => p.id))

  const cols = participants.length <= 2 ? 2
    : participants.length <= 4 ? 2
    : participants.length <= 6 ? 3 : 4

  return (
    <div className="border-b px-4 md:px-6 py-3"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      <div className="flex items-center gap-1 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: 'var(--color-video-room)' }} />
          <span className="relative inline-flex rounded-full h-2 w-2"
            style={{ background: 'var(--color-video-room)' }} />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest ml-1"
          style={{ color: 'var(--color-video-room)' }}>
          Video room — {participants.length} present
        </span>
      </div>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.min(cols, participants.length)}, minmax(0, 1fr))` }}
      >
        {participants.map((p, i) => {
          const color = avatarColor(p.colorSeed)
          const isMuted = muteIds.has(p.id)
          const noVideo = videoOffIds.has(p.id)
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 200 }}
              className="relative rounded-xl overflow-hidden"
              style={{
                background: noVideo ? `${color}20` : `${color}15`,
                border: p.isSelf ? `1.5px solid ${color}` : '1.5px solid var(--color-border)',
                aspectRatio: '4/3',
              }}
            >
              {/* Video placeholder / avatar */}
              <div className="absolute inset-0 flex items-center justify-center">
                {noVideo ? (
                  <VideoOff size={20} style={{ color, opacity: 0.5 }} strokeWidth={1.5} />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: color, color: 'white' }}
                  >
                    {p.initials.slice(0, 2)}
                  </div>
                )}
              </div>
              {/* Name tag */}
              <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 flex items-center justify-between"
                style={{ background: 'rgba(0,0,0,0.5)' }}>
                <span className="text-[10px] font-medium text-white truncate">
                  {p.isSelf ? 'You' : p.name}
                </span>
                {isMuted && <MicOff size={10} color="white" opacity={0.7} />}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
