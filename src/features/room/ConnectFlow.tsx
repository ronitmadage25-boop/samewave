import { motion, AnimatePresence } from 'framer-motion'
import type { Thought, ThoughtRelationship } from '@/types'

const RELATIONSHIPS: { id: ThoughtRelationship; label: string; hint: string }[] = [
  { id: 'builds-on', label: 'Builds on', hint: 'extends the idea further' },
  { id: 'relates-to', label: 'Relates to', hint: 'a similar thread' },
  { id: 'challenges', label: 'Challenges', hint: 'pushes back on it' },
  { id: 'extends', label: 'Extends', hint: 'applies it elsewhere' },
]

export function ConnectFlow({
  sourceThought,
  targetThought,
  onChooseRelationship,
  onCancel,
}: {
  sourceThought: Thought | null
  targetThought: Thought | null
  onChooseRelationship: (r: ThoughtRelationship) => void
  onCancel: () => void
}) {
  const open = !!sourceThought && !!targetThought

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-fg/40 z-40"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] max-w-md bg-surface border border-border rounded-[6px] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.15)]"
          >
            <p className="font-mono text-xs uppercase tracking-widest text-muted mb-4">Connect thoughts</p>
            <div className="space-y-2 mb-6">
              <p className="text-sm border-l-2 border-signal pl-3 py-1">"{sourceThought?.text}"</p>
              <p className="text-sm border-l-2 border-border pl-3 py-1 text-muted">"{targetThought?.text}"</p>
            </div>
            <p className="text-sm font-medium mb-3">How does the first relate to the second?</p>
            <div className="grid grid-cols-2 gap-2">
              {RELATIONSHIPS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onChooseRelationship(r.id)}
                  className="text-left border border-border rounded-[3px] p-3 hover:border-fg transition-colors"
                >
                  <div className="text-sm font-medium">{r.label}</div>
                  <div className="text-xs text-muted mt-0.5">{r.hint}</div>
                </button>
              ))}
            </div>
            <button onClick={onCancel} className="mt-4 text-xs text-muted hover:text-fg">
              Cancel
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
