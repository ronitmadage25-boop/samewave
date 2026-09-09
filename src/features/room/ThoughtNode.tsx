import { Handle, Position } from '@xyflow/react'
import { Sparkles, HelpCircle, Code2, Link2, BarChart2, AlertCircle } from 'lucide-react'
import { avatarColor } from '@/components/ui/AvatarCluster'
import type { ThoughtType } from '@/types'

export interface ThoughtNodeData {
  thoughtId: string
  text: string
  authorName: string
  authorInitials: string
  colorSeed: number
  reactionCount: number
  type?: ThoughtType
  isPriority?: boolean
  isSelf?: boolean
  isSelected?: boolean
  [key: string]: unknown
}

const TYPE_ICONS: Record<ThoughtType, typeof Sparkles> = {
  thought: Sparkles,
  question: HelpCircle,
  code: Code2,
  link: Link2,
  poll: BarChart2,
  image: Sparkles,
}

export function ThoughtNode({ data }: { data: ThoughtNodeData }) {
  const Icon = TYPE_ICONS[data.type || 'thought'] || Sparkles

  return (
    <div
      className={`rounded-xl border px-3.5 py-3 w-[220px] shadow-lg transition-all backdrop-blur-md bg-[var(--color-surface)]/95 ${
        data.isPriority
          ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-amber-500/10'
          : data.isSelf
          ? 'border-[var(--color-signal)] ring-1 ring-[var(--color-signal)]/30'
          : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-[var(--color-signal)] !border-2 !border-[var(--color-bg)] transition-transform hover:scale-125"
      />

      {/* Header with Type & Author */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 shadow-xs"
            style={{ background: avatarColor(data.colorSeed) }}
          >
            {data.authorInitials.slice(0, 2)}
          </div>
          <span className="text-[11px] text-[var(--color-fg)] font-medium truncate">
            {data.authorName}
          </span>
          {data.isSelf && (
            <span className="text-[8px] font-mono px-1 rounded bg-[var(--color-surface-2)] text-[var(--color-signal)]">
              YOU
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {data.isPriority && (
            <span className="p-0.5 rounded text-amber-400" title="Priority question">
              <AlertCircle size={12} />
            </span>
          )}
          <span className="text-[var(--color-muted)]">
            <Icon size={12} />
          </span>
        </div>
      </div>

      {/* Thought Content text */}
      <p className="text-xs leading-snug line-clamp-3 text-[var(--color-fg)]">
        {data.text}
      </p>

      {/* Footer info: Reactions */}
      <div className="mt-2.5 pt-1.5 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[10px] font-mono text-[var(--color-muted)]">
        <span>{data.reactionCount > 0 ? `${data.reactionCount} reactions` : 'Perspective'}</span>
        {data.type && data.type !== 'thought' && (
          <span className="capitalize text-[var(--color-signal)]">{data.type}</span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-[var(--color-signal)] !border-2 !border-[var(--color-bg)] transition-transform hover:scale-125"
      />
    </div>
  )
}
