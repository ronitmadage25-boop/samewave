import type { ReactNode } from 'react'
import { Radio } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface RequireAuthProps {
  children: ReactNode
  fallbackReason?: string
  inline?: boolean
}

export function RequireAuth({
  children,
  fallbackReason = 'Sign in with Google to access this space.',
  inline = false,
}: RequireAuthProps) {
  const { isAuthenticated, openAuthModal } = useAuth()

  if (isAuthenticated) {
    return <>{children}</>
  }

  if (inline) {
    return (
      <button
        onClick={() => openAuthModal(fallbackReason)}
        className="w-full p-4 rounded-xl border border-dashed border-[var(--color-border)] hover:border-[var(--color-signal)] text-center text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-all bg-[var(--color-surface)]/40"
      >
        <span>{fallbackReason} (Click to sign in)</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
      <div className="w-12 h-12 rounded-2xl bg-[var(--color-signal)]/15 text-[var(--color-signal)] flex items-center justify-center">
        <Radio size={24} />
      </div>
      <div>
        <h4 className="font-display text-base font-bold text-[var(--color-fg)]">
          Authentication Required
        </h4>
        <p className="text-xs text-[var(--color-muted)] mt-1 max-w-xs">
          {fallbackReason}
        </p>
      </div>
      <button
        onClick={() => openAuthModal(fallbackReason)}
        className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--color-signal)] text-white hover:opacity-90 transition-opacity shadow-md"
      >
        Sign in with Google
      </button>
    </div>
  )
}
