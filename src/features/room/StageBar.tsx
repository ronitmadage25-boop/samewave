import type { RoomStage } from '@/types'

const STAGES: { id: RoomStage; label: string; prompt: string }[] = [
  { id: 'arrive', label: '01 Arrive', prompt: "What's on your mind?" },
  { id: 'share', label: '02 Share', prompt: 'Drop a thought.' },
  { id: 'connect', label: '03 Connect', prompt: 'Find a thought that resonates.' },
  { id: 'wrap', label: '04 Wrap', prompt: 'Take something with you.' },
]

export function StageBar({ stage, onSelect }: { stage: RoomStage; onSelect: (s: RoomStage) => void }) {
  const currentIndex = STAGES.findIndex((s) => s.id === stage)
  const current = STAGES[currentIndex]

  return (
    <div className="border-b px-4 md:px-6 py-3 flex items-center justify-between gap-4"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      <div className="flex items-center gap-1">
        {STAGES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === currentIndex ? 28 : 16,
              background: i === currentIndex
                ? 'var(--color-signal)'
                : i < currentIndex
                  ? 'rgba(240,238,232,0.35)'
                  : 'var(--color-border)',
            }}
            aria-label={s.label}
            aria-current={i === currentIndex}
          />
        ))}
      </div>
      <p className="font-mono text-xs uppercase tracking-widest hidden sm:block"
        style={{ color: 'var(--color-muted)' }}>
        {current.prompt}
      </p>
    </div>
  )
}
