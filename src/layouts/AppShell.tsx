import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Radio, Zap, User, Plus, Wifi } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { ReactNode } from 'react'

const NAV_ITEMS = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/rooms', label: 'Live', icon: Wifi },
  { to: '/thoughts', label: 'Thoughts', icon: Zap },
  { to: '/identity', label: 'Identity', icon: User },
]

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{ background: 'var(--color-signal)' }} />
      <span className="relative inline-flex rounded-full h-2 w-2"
        style={{ background: 'var(--color-signal)' }} />
    </span>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const activeRoom = useAppStore((s) => s.activeRoom)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-[72px] xl:w-[220px] shrink-0 border-r"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        {/* Logo */}
        <div className="px-4 xl:px-6 py-6 flex items-center gap-3 border-b"
          style={{ borderColor: 'var(--color-border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-signal)' }}>
            <Radio size={16} color="white" strokeWidth={2} />
          </div>
          <span className="hidden xl:block font-display text-base font-semibold tracking-tight"
            style={{ color: 'var(--color-fg)' }}>
            SameWave
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 px-2 xl:px-3 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to
            return (
              <NavLink
                key={to}
                to={to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative"
                style={{
                  background: isActive ? 'var(--color-surface-2)' : 'transparent',
                  color: isActive ? 'var(--color-fg)' : 'var(--color-muted)',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                    style={{ background: 'var(--color-signal)' }}
                  />
                )}
                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                <span className="hidden xl:block text-sm font-medium">{label}</span>
                {to === '/rooms' && activeRoom && (
                  <span className="hidden xl:block ml-auto">
                    <LiveDot />
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Create room CTA */}
        <div className="p-2 xl:p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <NavLink
            to="/create-room"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full"
            style={{ background: 'var(--color-signal)', color: 'white' }}
          >
            <Plus size={18} strokeWidth={2} />
            <span className="hidden xl:block text-sm font-semibold">Create Room</span>
          </NavLink>
        </div>

        {/* Active room indicator */}
        <AnimatePresence>
          {activeRoom && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mx-2 xl:mx-3 mb-4 p-3 rounded-lg border"
              style={{ background: 'var(--color-signal-soft)', borderColor: 'var(--color-signal)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <LiveDot />
                <span className="text-[10px] font-mono uppercase tracking-widest"
                  style={{ color: 'var(--color-signal)' }}>
                  Live
                </span>
              </div>
              <p className="hidden xl:block text-xs font-medium truncate"
                style={{ color: 'var(--color-fg)' }}>
                {activeRoom.topicLabel}
              </p>
              <NavLink
                to="/room"
                className="hidden xl:block text-[10px] mt-1"
                style={{ color: 'var(--color-signal)' }}>
                Return to room →
              </NavLink>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto thin-scroll">
          {children}
        </div>
      </main>

      {/* Bottom tab bar — mobile */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden z-50 border-t"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-around px-1 py-2 safe-area-inset-bottom">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to
            return (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg relative min-w-[56px]"
                style={{ color: isActive ? 'var(--color-signal)' : 'var(--color-muted)' }}
              >
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[10px] font-medium">{label}</span>
              </NavLink>
            )
          })}
          <NavLink
            to="/create-room"
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px]"
            style={{ color: location.pathname === '/create-room' ? 'var(--color-signal)' : 'var(--color-muted)' }}
          >
            <Plus size={20} strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Create</span>
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
