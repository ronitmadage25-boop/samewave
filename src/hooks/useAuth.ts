import { useAppStore } from '@/store/useAppStore'
import { signInWithGoogle, signOut } from '@/services/auth'

export function useAuth() {
  const user = useAppStore((s) => s.user)
  const session = useAppStore((s) => s.session)
  const profile = useAppStore((s) => s.profile)
  const loading = useAppStore((s) => s.authLoading)
  const openAuthModal = useAppStore((s) => s.openAuthModal)
  const closeAuthModal = useAppStore((s) => s.closeAuthModal)

  return {
    user,
    session,
    profile,
    loading,
    isAuthenticated: Boolean(user),
    isGuest: !user,
    signInWithGoogle,
    signOut,
    openAuthModal,
    closeAuthModal,
  }
}
