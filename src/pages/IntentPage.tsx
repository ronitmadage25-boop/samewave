import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SUGGESTED_INTENTS } from '@/data/topics'
import { useAppStore } from '@/store/useAppStore'
import type { Category } from '@/types'

const CATEGORIES: Category[] = ['Tech', 'Creative', 'Social', 'Lifestyle']
const MAX_LEN = 140

export default function IntentPage() {
  const navigate = useNavigate()
  const broadcastIntent = useAppStore((s) => s.broadcastIntent)
  const [text, setText] = useState('')
  const [category, setCategory] = useState<Category>('Tech')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = text.trim().length >= 4 && !submitting

  function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    broadcastIntent(text.trim(), category)
    setTimeout(() => navigate('/broadcast'), 700)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="px-6 md:px-10 py-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-muted hover:text-fg transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="font-mono text-xs uppercase tracking-widest text-muted">01 / Intent</div>
      </header>

      <main className="flex-1 flex items-center px-6 md:px-10">
        <div className="max-w-2xl mx-auto w-full">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-xs uppercase tracking-widest text-signal mb-4"
          >
            What are you into right now?
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <textarea
              autoFocus
              value={text}
              maxLength={MAX_LEN}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
              }}
              placeholder="Trying to understand React hooks…"
              aria-label="What are you into right now"
              rows={3}
              className="w-full bg-transparent font-display text-3xl md:text-4xl font-medium leading-tight placeholder:text-muted/50 outline-none resize-none border-b border-border focus:border-fg pb-4 transition-colors"
            />
            <div className="flex justify-end mt-2">
              <span className="font-mono text-xs text-muted">{text.length}/{MAX_LEN}</span>
            </div>
          </motion.div>

          {/* Category selector */}
          <div className="mt-8 flex flex-wrap gap-2" role="radiogroup" aria-label="Category">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={category === c}
                onClick={() => setCategory(c)}
                className={[
                  'px-4 py-2 rounded-[3px] text-sm font-medium border transition-colors min-h-[40px]',
                  category === c
                    ? 'bg-fg text-bg border-fg'
                    : 'bg-transparent text-muted border-border hover:border-fg hover:text-fg',
                ].join(' ')}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Suggestions */}
          <div className="mt-10">
            <p className="font-mono text-xs uppercase tracking-widest text-muted mb-3">Or start from</p>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {SUGGESTED_INTENTS.map((s) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setText(s)}
                    className="text-sm text-left px-3 py-2 border border-border rounded-[3px] text-muted hover:text-fg hover:border-fg transition-colors"
                  >
                    {s}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-12">
            <Button
              size="lg"
              disabled={!canSubmit}
              onClick={handleSubmit}
              icon={<ArrowRight size={18} />}
              iconPosition="right"
            >
              {submitting ? 'Sending signal…' : 'Broadcast this thought'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
