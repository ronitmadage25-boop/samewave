import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Radio, Users, Clock, MessageSquare, Mic, Video,
  Plus, Trash2, ArrowRight, AlertCircle, RefreshCw, MoreVertical
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { fetchMyRooms, fetchAllPublicRooms, deleteRoomFromDB } from '@/services/rooms'
import type { DbRoom, RoomType } from '@/types'

const ROOM_TYPE_ICONS: Record<RoomType, typeof MessageSquare> = {
  text: MessageSquare,
  audio: Mic,
  video: Video,
}

const ROOM_TYPE_COLORS: Record<RoomType, string> = {
  text: 'var(--color-text-room)',
  audio: 'var(--color-audio-room)',
  video: 'var(--color-video-room)',
}

const ROOM_TYPE_BG: Record<RoomType, string> = {
  text: 'var(--color-text-room-soft)',
  audio: 'var(--color-audio-room-soft)',
  video: 'var(--color-video-room-soft)',
}

const CATEGORY_COLORS: Record<string, string> = {
  Tech: 'var(--color-tech)',
  Creative: 'var(--color-creative)',
  Social: 'var(--color-social)',
  Lifestyle: 'var(--color-lifestyle)',
}

function timeAgo(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function RoomCard({
  room,
  isOwner,
  onEnter,
  onDelete,
}: {
  room: DbRoom
  isOwner: boolean
  onEnter: () => void
  onDelete: () => void
}) {
  const Icon = ROOM_TYPE_ICONS[room.room_type]
  const typeColor = ROOM_TYPE_COLORS[room.room_type]
  const typeBg = ROOM_TYPE_BG[room.room_type]
  const catColor = CATEGORY_COLORS[room.category] || 'var(--color-muted)'
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl border p-5 relative group"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {/* Type badge + owner menu */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: typeBg, border: `1px solid ${typeColor}30` }}>
            <Icon size={16} style={{ color: typeColor }} strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest font-semibold"
              style={{ color: typeColor }}>
              {room.room_type}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                style={{ background: `${catColor}15`, color: catColor }}>
                {room.category}
              </span>
            </div>
          </div>
        </div>

        {/* Owner actions */}
        {isOwner && (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
              className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--color-muted)' }}
            >
              <MoreVertical size={14} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-8 z-50 rounded-xl border shadow-xl overflow-hidden"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', width: 160 }}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete() }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-red-500/10 transition-colors"
                      style={{ color: '#EF4444' }}
                    >
                      <Trash2 size={13} />
                      Delete wavelength
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="font-display text-base font-semibold mb-1.5 leading-snug"
        style={{ color: 'var(--color-fg)' }}>
        {room.title}
      </h3>

      {room.description && (
        <p className="text-xs leading-relaxed mb-4 line-clamp-2"
          style={{ color: 'var(--color-muted)' }}>
          {room.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t"
        style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Clock size={11} style={{ color: 'var(--color-muted)' }} />
            <span className="text-[11px] font-mono" style={{ color: 'var(--color-muted)' }}>
              {timeAgo(room.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={11} style={{ color: 'var(--color-muted)' }} />
            <span className="text-[11px] font-mono" style={{ color: 'var(--color-muted)' }}>
              {room.capacity} cap
            </span>
          </div>
        </div>

        <button
          onClick={onEnter}
          className="flex items-center gap-1 text-xs font-semibold transition-all hover:gap-2"
          style={{ color: 'var(--color-signal)' }}
        >
          Enter
          <ArrowRight size={13} />
        </button>
      </div>
    </motion.div>
  )
}

function DeleteConfirmModal({
  room,
  onConfirm,
  onCancel,
}: {
  room: DbRoom
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="rounded-2xl border p-6 max-w-sm w-full"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-semibold mb-2"
          style={{ color: 'var(--color-fg)' }}>
          Delete this wavelength?
        </h3>
        <p className="text-sm mb-1" style={{ color: 'var(--color-muted)' }}>
          <strong style={{ color: 'var(--color-fg)' }}>{room.title}</strong>
        </p>
        <p className="text-xs mb-6" style={{ color: 'var(--color-muted)' }}>
          This removes the saved room from your Home. Any active live session will also end.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const profile = useAppStore((s) => s.profile)
  const openAuthModal = useAppStore((s) => s.openAuthModal)

  const [myRooms, setMyRooms] = useState<DbRoom[]>([])
  const [publicRooms, setPublicRooms] = useState<DbRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'mine' | 'public'>('mine')
  const [deleteTarget, setDeleteTarget] = useState<DbRoom | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadRooms = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (user) {
      const [myRes, pubRes] = await Promise.all([
        fetchMyRooms(user.id),
        fetchAllPublicRooms(),
      ])
      if (myRes.error) setError(myRes.error)
      else setMyRooms(myRes.data)

      if (!pubRes.error) setPublicRooms(pubRes.data)
    } else {
      const pubRes = await fetchAllPublicRooms()
      if (!pubRes.error) setPublicRooms(pubRes.data)
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    loadRooms()
  }, [loadRooms])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await deleteRoomFromDB(deleteTarget.id)
    if (error) {
      console.error('Delete failed:', error)
    } else {
      setMyRooms((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      setPublicRooms((prev) => prev.filter((r) => r.id !== deleteTarget.id))
    }
    setDeleteTarget(null)
    setDeleting(false)
  }

  function handleEnter(room: DbRoom) {
    if (!user) {
      openAuthModal('Sign in with Google to enter a room.')
      return
    }
    navigate(`/room/${room.id}?type=${room.room_type}&title=${encodeURIComponent(room.title)}&category=${encodeURIComponent(room.category)}`)
  }

  const displayedRooms = tab === 'mine' ? myRooms : publicRooms.filter((r) => r.creator_id !== user?.id)

  return (
    <div className="min-h-screen pb-24 lg:pb-8" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 px-6 lg:px-8 py-4 border-b"
        style={{ background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(16px)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold" style={{ color: 'var(--color-fg)' }}>
              {user ? `Hey, ${profile?.displayName?.split(' ')[0] ?? 'there'}` : 'SameWave'}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
              {user ? 'Your wavelengths' : 'Ephemeral social spaces around shared ideas'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadRooms()}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
              style={{ color: 'var(--color-muted)' }}
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => {
                if (!user) {
                  openAuthModal('Sign in with Google to create a room.')
                  return
                }
                navigate('/create-room')
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--color-signal)', color: 'white' }}
            >
              <Plus size={15} strokeWidth={2.5} />
              <span className="hidden sm:inline">Create room</span>
            </button>
          </div>
        </div>

        {/* Tab toggle — only show if authenticated */}
        {user && (
          <div className="flex items-center gap-1 mt-3 border rounded-xl p-0.5 w-fit"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            {[
              { id: 'mine' as const, label: 'My wavelengths' },
              { id: 'public' as const, label: 'All public' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: tab === t.id ? 'var(--color-surface-2)' : 'transparent',
                  color: tab === t.id ? 'var(--color-fg)' : 'var(--color-muted)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="px-6 lg:px-8 py-6 max-w-5xl mx-auto">
        {/* Error state */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl border mb-6"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <AlertCircle size={16} style={{ color: 'var(--color-signal)' }} />
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Could not load rooms: {error}
            </p>
            <button onClick={loadRooms} className="ml-auto text-xs font-medium"
              style={{ color: 'var(--color-signal)' }}>
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border p-5 animate-pulse"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', minHeight: 160 }} />
            ))}
          </div>
        )}

        {/* Room grid */}
        {!loading && (
          <AnimatePresence mode="wait">
            {displayedRooms.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <Radio size={28} style={{ color: 'var(--color-muted)' }} strokeWidth={1.5} />
                </div>
                <p className="text-base font-semibold mb-2" style={{ color: 'var(--color-fg)' }}>
                  {tab === 'mine' ? 'No wavelengths yet.' : 'No public rooms right now.'}
                </p>
                <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
                  {tab === 'mine'
                    ? 'Create your first wavelength to get started.'
                    : 'Be the first to create one.'}
                </p>
                {user ? (
                  <button
                    onClick={() => navigate('/create-room')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--color-signal)', color: 'white' }}
                  >
                    <Plus size={15} />
                    Create a room
                  </button>
                ) : (
                  <button
                    onClick={() => openAuthModal('Sign in to create a room.')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--color-signal)', color: 'white' }}
                  >
                    Sign in to create
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {displayedRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    isOwner={room.creator_id === user?.id}
                    onEnter={() => handleEnter(room)}
                    onDelete={() => setDeleteTarget(room)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirmModal
            room={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Loading overlay during delete */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="text-sm font-mono" style={{ color: 'white' }}>Deleting…</div>
        </div>
      )}
    </div>
  )
}
