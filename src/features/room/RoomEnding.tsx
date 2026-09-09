import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Bookmark, ArrowRight, Check } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Room } from '@/types'

export function RoomEnding({ room, onContinue }: { room: Room; onContinue: () => void }) {
  const saveMoment = useAppStore((s) => s.saveMoment)
  const [saved, setSaved] = useState(false)

  const perspectiveCount = new Set(room.connections.map((c) => c.relationship)).size

  function handleSaveMoment() {
    saveMoment()
    setSaved(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)] flex items-center justify-center px-6 py-12 relative overflow-hidden"
    >
      {/* Background ambient constellation glow */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-[var(--color-signal)] filter blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 rounded-full bg-[var(--color-resonance)] filter blur-[120px]" />
      </div>

      <div className="max-w-xl w-full text-center relative z-10">
        {/* Ceremony Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-signal-soft)] text-[var(--color-signal)] font-mono text-xs uppercase tracking-widest mb-6 border border-[var(--color-signal)]/20"
        >
          <Sparkles size={12} />
          <span>The moment is closing</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-display text-3xl md:text-5xl font-semibold mb-4 leading-tight"
        >
          {room.topicLabel}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-sm text-[var(--color-muted)] max-w-md mx-auto mb-10"
        >
          Minds converged, thoughts connected, and an authentic collective perspective emerged.
        </motion.p>

        {/* Highlight Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Minds Gathered', value: room.participants.length },
            { label: 'Thoughts Shared', value: room.thoughts.length },
            { label: 'Connections', value: room.connections.length },
            { label: 'Perspectives', value: Math.max(1, perspectiveCount) },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs"
            >
              <div className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-fg)]">
                {stat.value}
              </div>
              <div className="text-[11px] text-[var(--color-muted)] font-mono uppercase tracking-wide mt-1">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Thought constellation teaser */}
        {room.thoughts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 }}
            className="p-4 rounded-2xl bg-[var(--color-surface)]/60 border border-[var(--color-border)] mb-10 text-left"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-muted)] block mb-2">
              Core Thread
            </span>
            <p className="text-xs sm:text-sm font-medium italic text-[var(--color-fg)] line-clamp-2">
              "{room.thoughts[0]?.text}"
            </p>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleSaveMoment}
            disabled={saved}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-xs sm:text-sm transition-all shadow-md ${
              saved
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                : 'bg-[var(--color-signal)] text-white hover:opacity-95'
            }`}
          >
            {saved ? (
              <>
                <Check size={16} />
                <span>Moment Saved to Identity</span>
              </>
            ) : (
              <>
                <Bookmark size={16} />
                <span>Save Moment to My Identity</span>
              </>
            )}
          </button>

          <button
            onClick={onContinue}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-xs sm:text-sm border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors text-[var(--color-fg)]"
          >
            <span>View Full Summary</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
