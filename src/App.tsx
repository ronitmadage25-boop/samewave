import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { AuthModal } from '@/components/auth/AuthModal'
import { AppShell } from '@/layouts/AppShell'
import LandingPage from '@/pages/LandingPage'
import IntentPage from '@/pages/IntentPage'
import BroadcastPage from '@/pages/BroadcastPage'
import ResonancePage from '@/pages/ResonancePage'
import HomePage from '@/pages/HomePage'
import RoomsPage from '@/pages/RoomsPage'
import CreateRoomPage from '@/pages/CreateRoomPage'
import ThoughtsPage from '@/pages/ThoughtsPage'
import CurrentPage from '@/pages/CurrentPage'
import SummaryPage from '@/pages/SummaryPage'
import IdentityPage from '@/pages/IdentityPage'
import MapPage from '@/pages/MapPage'

// RoomPage pulls in @xyflow/react — lazy-load to keep initial bundle lean
const RoomPage = lazy(() => import('@/pages/RoomPage'))

function RoomFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--color-bg)' }}>
      <p className="font-mono text-xs uppercase tracking-widest"
        style={{ color: 'var(--color-muted)' }}>
        Entering moment…
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
        {/* Pre-shell entry flow */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/intent" element={<IntentPage />} />
        <Route path="/broadcast" element={<BroadcastPage />} />
        <Route path="/resonance" element={<ResonancePage />} />

        {/* Shell-wrapped app routes */}
        <Route path="/home" element={<AppShell><HomePage /></AppShell>} />
        <Route path="/rooms" element={<AppShell><RoomsPage /></AppShell>} />
        <Route path="/create-room" element={<AppShell><CreateRoomPage /></AppShell>} />
        <Route path="/thoughts" element={<AppShell><ThoughtsPage /></AppShell>} />
        <Route path="/current" element={<AppShell><CurrentPage /></AppShell>} />
        <Route path="/identity" element={<AppShell><IdentityPage /></AppShell>} />
        <Route path="/discover" element={<AppShell><MapPage /></AppShell>} />
        <Route path="/summary" element={<AppShell><SummaryPage /></AppShell>} />

        {/* Room — has real ID in URL so refresh/share works */}
        <Route
          path="/room/:roomId"
          element={
            <Suspense fallback={<RoomFallback />}>
              <RoomPage />
            </Suspense>
          }
        />

        {/* Legacy /room redirect — redirect to rooms if no ID */}
        <Route
          path="/room"
          element={
            <Suspense fallback={<RoomFallback />}>
              <RoomPage />
            </Suspense>
          }
        />
      </Routes>
      <AuthModal />
    </>
  )
}
