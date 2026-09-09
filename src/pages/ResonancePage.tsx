import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/Tag'

export default function ResonancePage() {
  const navigate = useNavigate()
  const wavelength = useAppStore((s) => s.wavelength)
  const getTop = useAppStore((s) => s.getTopResonantTopics)

  if (!wavelength) {
    navigate('/intent')
    return null
  }

  const top = getTop(4)
  const primary = top[0]

  function handleEnter(_topicId: string) {
    // Navigate to live rooms discovery filtered by topic
    navigate('/rooms')
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="px-6 md:px-10 py-6 flex items-center justify-between">
        <button onClick={() => navigate('/intent')} className="flex items-center gap-2 text-sm text-muted hover:text-fg transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="font-mono text-xs uppercase tracking-widest text-muted">03 / Resonance</div>
      </header>

      <main className="px-6 md:px-10 pb-24 max-w-5xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-mono text-xs uppercase tracking-widest text-signal mb-3"
        >
          Your wavelength
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="font-display text-4xl md:text-6xl font-semibold leading-tight mb-4"
        >
          {primary?.label}
        </motion.h1>
        <p className="text-muted text-lg mb-14">
          {primary?.mindsCount} minds are here. Resonance measures how close a
          conversation is to what you're thinking about — not a ranking of people.
        </p>

        <div className="space-y-4">
          {top.map((topic, i) => (
            <motion.button
              key={topic.id}
              onClick={() => handleEnter(topic.id)}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="w-full text-left flex items-center gap-6 border border-border rounded-[4px] px-6 py-5 hover:border-fg transition-colors group"
            >
              <div className="font-mono text-2xl text-muted w-10 shrink-0">{String(i + 1).padStart(2, '0')}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-display text-xl md:text-2xl font-medium">{topic.label}</h3>
                  <Tag tone="default">{topic.mindsCount} minds</Tag>
                </div>
                <p className="text-sm text-muted mt-1 truncate">
                  "{topic.sampleThoughts[0]}"
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="font-display text-2xl font-semibold text-resonance">{topic.resonance}%</div>
                  <div className="font-mono text-[10px] uppercase tracking-wide text-muted">resonance</div>
                </div>
                <ArrowRight size={18} className="text-muted group-hover:text-fg group-hover:translate-x-1 transition-all" />
              </div>
            </motion.button>
          ))}
        </div>

        <div className="mt-14 flex justify-center">
          <Button variant="outline" onClick={() => navigate('/discover')}>
            See the full live map instead
          </Button>
        </div>
      </main>
    </div>
  )
}
