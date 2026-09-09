import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ReactionType, Reaction } from '@/types'
import { REACTION_META } from '@/types'

export function ReactionBar({
  reactions,
  myReaction,
  onReact,
  compact = false,
}: {
  reactions: Reaction[]
  myReaction?: ReactionType
  onReact: (type: ReactionType) => void
  compact?: boolean
}) {
  const [hovered, setHovered] = useState<ReactionType | null>(null)
  const [expanded, setExpanded] = useState(false)

  const hasAny = reactions.some((r) => r.count > 0)
  const activeReactions = reactions.filter((r) => r.count > 0 || r.type === myReaction)

  if (compact && !hasAny && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-all"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
      >
        + React
      </button>
    )
  }

  return (
    <div className="flex items-center flex-wrap gap-1.5">
      {/* Active reactions (compact) */}
      {compact && !expanded && activeReactions.map((r) => {
        const meta = REACTION_META[r.type]
        const active = myReaction === r.type
        return (
          <motion.button
            key={r.type}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => onReact(r.type)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all"
            style={{
              background: active ? `${meta.color}20` : 'transparent',
              borderColor: active ? meta.color : 'var(--color-border)',
              color: active ? meta.color : 'var(--color-muted)',
            }}
          >
            <span>{meta.emoji}</span>
            <span>{r.count}</span>
          </motion.button>
        )
      })}

      {/* Expanded: all reactions */}
      <AnimatePresence>
        {(!compact || expanded) && (
          <motion.div
            initial={compact ? { opacity: 0, scale: 0.9 } : { opacity: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center flex-wrap gap-1.5"
          >
            {reactions.map((r) => {
              const meta = REACTION_META[r.type]
              const active = myReaction === r.type
              const isHovered = hovered === r.type
              return (
                <div key={r.type} className="relative">
                  {/* Tooltip */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap pointer-events-none z-20"
                        style={{ background: 'var(--color-surface-3)', color: 'var(--color-fg)' }}
                      >
                        {meta.label}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.button
                    whileHover={{ scale: 1.12, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { onReact(r.type); if (compact) setExpanded(false) }}
                    onMouseEnter={() => setHovered(r.type)}
                    onMouseLeave={() => setHovered(null)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all"
                    style={{
                      background: active ? `${meta.color}20` : 'transparent',
                      borderColor: active ? meta.color : 'var(--color-border)',
                      color: active ? meta.color : 'var(--color-muted)',
                    }}
                  >
                    <span className="text-sm" style={{ fontFamily: 'monospace' }}>{meta.emoji}</span>
                    {r.count > 0 && (
                      <motion.span
                        key={r.count}
                        initial={{ scale: 1.4 }}
                        animate={{ scale: 1 }}
                        className="font-data font-semibold"
                      >
                        {r.count}
                      </motion.span>
                    )}
                  </motion.button>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {compact && activeReactions.length > 0 && !expanded && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] px-2 py-1 rounded-lg border transition-all"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
        >
          {expanded ? '✕' : '+ More'}
        </button>
      )}
    </div>
  )
}
