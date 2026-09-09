import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Participant } from '@/types'

const VERBS = ['just joined', 'is exploring this thought', 'is writing']

export function PresenceStrip({ participants }: { participants: Participant[] }) {
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    const others = participants.filter((p) => !p.isSelf)
    if (others.length === 0) return
    const interval = setInterval(() => {
      const person = others[Math.floor(Math.random() * others.length)]
      const verb = VERBS[Math.floor(Math.random() * VERBS.length)]
      setNote(`${person.name} ${verb}`)
      setTimeout(() => setNote(null), 3200)
    }, 6000 + Math.random() * 3000)
    return () => clearInterval(interval)
  }, [participants])

  return (
    <div className="h-6 px-4 md:px-8 flex items-center">
      <AnimatePresence mode="wait">
        {note && (
          <motion.p
            key={note}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[11px] text-muted italic"
          >
            {note}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
