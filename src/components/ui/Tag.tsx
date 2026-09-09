import type { ReactNode } from 'react'

export function Tag({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'signal' | 'resonance'
}) {
  const toneClasses = {
    default: 'text-muted border-border',
    signal: 'text-signal border-signal/40 bg-signal-soft/40',
    resonance: 'text-resonance border-resonance/40 bg-resonance-soft/60',
  }[tone]
  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-[2px] px-2 py-1 text-[11px] font-mono uppercase tracking-wider ${toneClasses}`}
    >
      {children}
    </span>
  )
}
