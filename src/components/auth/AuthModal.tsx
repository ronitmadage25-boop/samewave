import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Radio, X, Sparkles, Shield, AlertCircle } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { signInWithGoogle } from '@/services/auth'
import { isSupabaseConfigured } from '@/lib/supabase'

export function AuthModal() {
  const isOpen = useAppStore((s) => s.authModalOpen)
  const reason = useAppStore((s) => s.authModalReason)
  const closeAuthModal = useAppStore((s) => s.closeAuthModal)

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const isConfigured = isSupabaseConfigured()

  async function handleGoogleSignIn() {
    setIsLoading(true)
    setErrorMessage(null)

    const { error } = await signInWithGoogle()
    if (error) {
      setIsLoading(false)
      const msg = error.message || ''
      if (msg.includes('not yet configured')) {
        setErrorMessage('Google Sign-In requires your Supabase Publishable Key in .env and Google OAuth enabled in Supabase.')
      } else if (
        msg.toLowerCase().includes('provider is not enabled') ||
        msg.toLowerCase().includes('unsupported provider') ||
        msg.toLowerCase().includes('validation_failed')
      ) {
        setErrorMessage('Google OAuth is not yet enabled in your Supabase project. In Supabase Dashboard, navigate to Authentication → Providers → Google to enable it.')
      } else {
        setErrorMessage(msg)
      }
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden z-10"
        >
          {/* Top ambient wavelength beam */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[var(--color-signal)] via-[var(--color-resonance)] to-[var(--color-creative)]" />

          {/* Close button */}
          <button
            onClick={closeAuthModal}
            aria-label="Close authentication prompt"
            className="absolute top-4 right-4 p-2 rounded-full text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <X size={18} />
          </button>

          <div className="p-6 md:p-8 space-y-6">
            {/* Brand Aura Icon */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--color-signal)] shadow-lg shadow-[var(--color-signal)]/20 text-white shrink-0">
                <Radio size={24} strokeWidth={2.2} />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--color-signal)] font-bold">
                  SameWave Identity
                </span>
                <h3 className="font-display text-xl font-bold text-[var(--color-fg)]">
                  Your wavelength is waiting
                </h3>
              </div>
            </div>

            {/* Contextual description */}
            <p className="text-sm leading-relaxed text-[var(--color-muted)]">
              {reason || 'Sign in with Google to enter temporary spaces, drop thoughts, and preserve collective moments.'}
            </p>

            {/* SameWave core values checkmark list */}
            <div className="p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2 text-xs text-[var(--color-fg)]">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-[var(--color-signal)] shrink-0" />
                <span>Proximity of Thought: connect on shared intent, not follower counts.</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={13} className="text-[var(--color-resonance)] shrink-0" />
                <span>Temporary spaces: live presence without infinite social noise.</span>
              </div>
            </div>

            {/* Error banner if triggered */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Notice if keys are pending in development */}
            {!isConfigured && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-snug">
                <p className="font-semibold mb-1">Backend Configuration Notice:</p>
                <p>
                  To authenticate via Google, add your Supabase Publishable Key to <code className="font-mono text-amber-200">.env</code>.
                </p>
              </div>
            )}

            {/* Sign in with Google primary button */}
            <div className="space-y-2.5">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-white text-gray-900 font-semibold text-sm hover:bg-gray-100 active:scale-[0.99] transition-all shadow-md disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              <button
                onClick={closeAuthModal}
                className="w-full text-center py-2 text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors"
              >
                Continue exploring as guest
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
