import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { AuthModal } from '@/components/auth/AuthModal'
import { AppShell } from '@/layouts/AppShell'
import LandingPage from '@/pages/LandingPage'
import HomePage from '@/pages/HomePage'
import RoomsPage from '@/pages/RoomsPage'
import CreateRoomPage from '@/pages/CreateRoomPage'
import ThoughtsPage from '@/pages/ThoughtsPage'
import CurrentPage from '@/pages/CurrentPage'
import IdentityPage from '@/pages/IdentityPage'

// RoomPage pulls in heavy deps — lazy-load to keep initial bundle lean
const RoomPage = lazy(() => import('@/pages/RoomPage'))

function RoomFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--color-bg)' }}>
      <p className="font-mono text-xs uppercase tracking-widest"
        style={{ color: 'var(--color-muted)' }}>
        Entering wavelength…
      </p>
    </div>
  )
}

export default function App() {
  const initAuth = useAppStore((s) => s.initAuth)

  useEffect(() => {
    const cleanup = initAuth()
    return () => {
      cleanup()
    }
  }, [initAuth])

  return (
    <>
      <Routes>
        {/* Landing */}
        <Route path="/" element={<LandingPage />} />

        {/* Shell-wrapped app routes */}
        <Route path="/home" element={<AppShell><HomePage /></AppShell>} />
        <Route path="/rooms" element={<AppShell><RoomsPage /></AppShell>} />
        <Route path="/create-room" element={<AppShell><CreateRoomPage /></AppShell>} />
        <Route path="/thoughts" element={<AppShell><ThoughtsPage /></AppShell>} />
        <Route path="/current" element={<AppShell><CurrentPage /></AppShell>} />
        <Route path="/identity" element={<AppShell><IdentityPage /></AppShell>} />

        {/* Room — real UUID in URL so refresh/share works */}
        <Route
          path="/room/:roomId"
          element={
            <Suspense fallback={<RoomFallback />}>
              <RoomPage />
            </Suspense>
          }
        />

        {/* Legacy /room without ID — go to live rooms */}
        <Route path="/room" element={<Navigate to="/rooms" replace />} />

        {/* Removed routes: redirect to home */}
        <Route path="/intent" element={<Navigate to="/home" replace />} />
        <Route path="/broadcast" element={<Navigate to="/home" replace />} />
        <Route path="/resonance" element={<Navigate to="/home" replace />} />
        <Route path="/discover" element={<Navigate to="/rooms" replace />} />
        <Route path="/summary" element={<Navigate to="/home" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AuthModal />
    </>
  )
}
