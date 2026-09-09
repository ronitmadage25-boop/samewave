import type { Participant } from '@/types'

const HUES = [18, 150, 260, 340, 40, 200, 100, 300, 60, 220]

export function avatarColor(seed: number) {
  const hue = HUES[seed % HUES.length]
  return `hsl(${hue} 45% 42%)`
}

export function AvatarCluster({ participants, max = 5 }: { participants: Participant[]; max?: number }) {
  const shown = participants.slice(0, max)
  const overflow = participants.length - shown.length
  return (
    <div className="flex items-center" aria-label={`${participants.length} people present`}>
      <div className="flex -space-x-2">
        {shown.map((p) => (
          <div
            key={p.id}
            title={p.name}
            className="w-7 h-7 rounded-full border-2 border-bg flex items-center justify-center text-[10px] font-semibold text-white"
            style={{ background: avatarColor(p.colorSeed) }}
          >
            {p.initials.slice(0, 2)}
          </div>
        ))}
      </div>
      {overflow > 0 && (
        <span className="ml-2 text-xs text-muted font-medium">+{overflow} more</span>
      )}
    </div>
  )
}
