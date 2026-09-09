import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'

const STAGES = ['thought', 'broadcasting', 'scanning', 'match'] as const
type Stage = typeof STAGES[number]

const STAGE_LABEL: Record<Stage, string> = {
  thought: 'Your thought',
  broadcasting: 'Broadcasting',
  scanning: 'Scanning for resonance',
  match: 'Match found',
}

function Waveform({ intensity }: { intensity: number }) {
  const bars = 28
  return (
    <div className="flex items-center justify-center gap-[3px] h-24" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => {
        const base = Math.sin(i * 0.7) * 0.5 + 0.5
        return (
          <motion.div
            key={i}
            className="w-[3px] bg-signal rounded-full"
            animate={{
              height: [
                `${8 + base * 10}%`,
                `${20 + base * 70 * intensity}%`,
                `${8 + base * 10}%`,
              ],
            }}
            transition={{
              duration: 0.9 + (i % 5) * 0.1,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.02,
            }}
            style={{ height: '20%' }}
          />
        )
      })}
    </div>
  )
}

export default function BroadcastPage() {
  const navigate = useNavigate()
  const wavelength = useAppStore((s) => s.wavelength)
  const getTop = useAppStore((s) => s.getTopResonantTopics)
  const [stage, setStage] = useState<Stage>('thought')

  useEffect(() => {
    if (!wavelength) {
      navigate('/intent')
      return
    }
    const timers = [
      setTimeout(() => setStage('broadcasting'), 900),
      setTimeout(() => setStage('scanning'), 2000),
      setTimeout(() => setStage('match'), 3400),
      setTimeout(() => navigate('/resonance'), 4600),
    ]
    return () => timers.forEach(clearTimeout)
  }, [wavelength, navigate])

  if (!wavelength) return null

  const intensity = stage === 'thought' ? 0.15 : stage === 'broadcasting' ? 0.6 : stage === 'scanning' ? 1 : 0.4

  return (
    <div className="min-h-screen bg-fg text-bg flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-bg/40">
        02 / Broadcast
      </div>

      <div className="max-w-lg w-full text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={stage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="font-mono text-xs uppercase tracking-widest text-signal mb-6"
          >
            {STAGE_LABEL[stage]}
          </motion.p>
        </AnimatePresence>

        <motion.p
          layout
          className="font-display text-2xl md:text-3xl font-medium mb-10 leading-snug"
        >
          "{wavelength.text}"
        </motion.p>

        <Waveform intensity={intensity} />

        <AnimatePresence>
          {stage === 'match' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-10"
            >
              <p className="font-display text-xl">
                {getTop(1)[0]?.mindsCount ?? 0} minds are near your wavelength
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-center gap-2 mt-14">
          {STAGES.map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all duration-300 ${
                STAGES.indexOf(s) <= STAGES.indexOf(stage) ? 'bg-signal w-8' : 'bg-bg/20 w-4'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
