import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare, Mic, Video, ArrowRight, ArrowLeft,
  Users, Clock, Globe, Lock, Network, Palette,
  FileText, HelpCircle, Zap, Check
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { RoomType, Category, RoomTool } from '@/types'

const ROOM_TYPES: { type: RoomType; label: string; icon: typeof MessageSquare; color: string; bg: string; desc: string; vibe: string }[] = [
  {
    type: 'text',
    label: 'Text Room',
    icon: MessageSquare,
    color: 'var(--color-text-room)',
    bg: 'var(--color-text-room-soft)',
    desc: 'Deep async thought exchange. Share ideas, react meaningfully, build a thought graph.',
    vibe: 'Thoughtful · Async · Ideas',
  },
  {
    type: 'audio',
    label: 'Audio Room',
    icon: Mic,
    color: 'var(--color-audio-room)',
    bg: 'var(--color-audio-room-soft)',
    desc: 'Live voice conversations. People speak, listen, and react in real time.',
    vibe: 'Live · Voice · Present',
  },
  {
    type: 'video',
    label: 'Video Room',
    icon: Video,
    color: 'var(--color-video-room)',
    bg: 'var(--color-video-room-soft)',
    desc: 'Face-to-face social presence. See each other, collaborate, show your work.',
    vibe: 'Visual · Present · Collaborative',
  },
]

const CATEGORIES: Category[] = ['Tech', 'Creative', 'Social', 'Lifestyle']

const TOOLS: { id: RoomTool; label: string; icon: typeof Zap; desc: string }[] = [
  { id: 'reactions', label: 'Reactions', icon: Zap, desc: 'Meaningful multi-type reactions' },
  { id: 'thought-graph', label: 'Thought Graph', icon: Network, desc: 'Connect ideas visually' },
  { id: 'whiteboard', label: 'Whiteboard', icon: Palette, desc: 'Collaborative drawing canvas' },
  { id: 'priority-questions', label: 'Priority Questions', icon: HelpCircle, desc: 'Upvoteable question queue' },
  { id: 'file-sharing', label: 'File Sharing', icon: FileText, desc: 'Share code, images, docs' },
]

const DURATION_OPTIONS = [15, 30, 45, 60, 90]
const CAPACITY_OPTIONS = [8, 16, 32, 64, 100]

const STEPS = ['Type', 'Identity', 'Parameters', 'Tools', 'Launch']

export default function CreateRoomPage() {
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const openAuthModal = useAppStore((s) => s.openAuthModal)
  const createRoom = useAppStore((s) => s.createRoom)

  const [step, setStep] = useState(0)
  const [type, setType] = useState<RoomType | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category>('Tech')
  const [capacity, setCapacity] = useState(32)
  const [duration, setDuration] = useState(45)
  const [visibility, setVisibility] = useState<'public' | 'invite'>('public')
  const [tools, setTools] = useState<RoomTool[]>(['reactions', 'thought-graph'])
  const [launching, setLaunching] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function toggleTool(t: RoomTool) {
    setTools(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  function handleNext() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
  }

  function handleBack() {
    if (step > 0) setStep(s => s - 1)
  }

  function handleLaunch() {
    if (!type || !title.trim()) return

    if (!user) {
      openAuthModal('Sign in with Google to form a new social space.')
      return
    }

    setLaunching(true)
    setErrorMsg(null)

    createRoom({
      title: title.trim(),
      type,
      category,
      description,
      capacity,
      durationMinutes: duration,
      visibility,
      tools,
    })
    navigate('/room')
  }

  const canProceed = [
    type !== null,
    title.trim().length >= 3,
    true,
    true,
    true,
  ][step]

  return (
    <div className="min-h-screen flex flex-col pb-24 lg:pb-8" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="px-6 lg:px-8 py-5 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={step === 0 ? () => navigate(-1) : handleBack}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'var(--color-muted)' }}
        >
          <ArrowLeft size={16} />
          {step === 0 ? 'Back' : STEPS[step - 1]}
        </button>
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="transition-all rounded-full"
              style={{
                width: i === step ? 24 : 6,
                height: 6,
                background: i <= step ? 'var(--color-signal)' : 'var(--color-surface-3)',
              }}
            />
          ))}
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
          {step + 1} / {STEPS.length}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 lg:px-8 py-8">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {/* Step 0: Choose type */}
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <p className="font-mono text-xs uppercase tracking-widest mb-3"
                  style={{ color: 'var(--color-signal)' }}>
                  Step 1 — Room type
                </p>
                <h2 className="font-display text-3xl md:text-4xl font-semibold mb-8"
                  style={{ color: 'var(--color-fg)' }}>
                  What kind of space
                  <br />are you forming?
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {ROOM_TYPES.map((rt) => (
                    <motion.button
                      key={rt.type}
                      onClick={() => setType(rt.type)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="text-left p-6 rounded-2xl border-2 transition-all"
                      style={{
                        background: type === rt.type ? rt.bg : 'var(--color-surface)',
                        borderColor: type === rt.type ? rt.color : 'var(--color-border)',
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${rt.color}20`, border: `1px solid ${rt.color}40` }}>
                          <rt.icon size={22} style={{ color: rt.color }} strokeWidth={1.5} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-base" style={{ color: 'var(--color-fg)' }}>
                              {rt.label}
                            </h3>
                            {type === rt.type && (
                              <div className="w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ background: rt.color }}>
                                <Check size={12} color="white" strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          <p className="text-sm mb-2" style={{ color: 'var(--color-muted)' }}>
                            {rt.desc}
                          </p>
                          <span className="text-[11px] font-mono" style={{ color: rt.color }}>
                            {rt.vibe}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 1: Identity */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <p className="font-mono text-xs uppercase tracking-widest mb-3"
                  style={{ color: 'var(--color-signal)' }}>
                  Step 2 — Room identity
                </p>
                <h2 className="font-display text-3xl md:text-4xl font-semibold mb-8"
                  style={{ color: 'var(--color-fg)' }}>
                  Give your room
                  <br />a presence.
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-mono uppercase tracking-widest block mb-3"
                      style={{ color: 'var(--color-muted)' }}>
                      Room title
                    </label>
                    <input
                      autoFocus
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="What's this room about?"
                      maxLength={80}
                      className="w-full bg-transparent font-display text-2xl md:text-3xl font-medium leading-tight placeholder:opacity-30 outline-none border-b py-3 transition-colors"
                      style={{
                        color: 'var(--color-fg)',
                        borderColor: title.length > 0 ? 'var(--color-signal)' : 'var(--color-border)',
                      }}
                    />
                    <div className="text-right mt-1.5">
                      <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                        {title.length}/80
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-mono uppercase tracking-widest block mb-3"
                      style={{ color: 'var(--color-muted)' }}>
                      Purpose or opening question (optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="What's the central question or intention for this space?"
                      rows={3}
                      maxLength={200}
                      className="w-full bg-transparent text-base leading-relaxed placeholder:opacity-30 outline-none border rounded-xl px-4 py-3 resize-none transition-colors"
                      style={{
                        color: 'var(--color-fg)',
                        borderColor: 'var(--color-border)',
                        background: 'var(--color-surface)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono uppercase tracking-widest block mb-3"
                      style={{ color: 'var(--color-muted)' }}>
                      Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((c) => (
                        <button
                          key={c}
                          onClick={() => setCategory(c)}
                          className="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                          style={{
                            background: category === c ? 'var(--color-surface-2)' : 'transparent',
                            borderColor: category === c ? 'var(--color-fg)' : 'var(--color-border)',
                            color: category === c ? 'var(--color-fg)' : 'var(--color-muted)',
                          }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Parameters */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <p className="font-mono text-xs uppercase tracking-widest mb-3"
                  style={{ color: 'var(--color-signal)' }}>
                  Step 3 — Parameters
                </p>
                <h2 className="font-display text-3xl md:text-4xl font-semibold mb-8"
                  style={{ color: 'var(--color-fg)' }}>
                  Shape the
                  <br />space.
                </h2>

                <div className="space-y-8">
                  {/* Capacity */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-mono uppercase tracking-widest"
                        style={{ color: 'var(--color-muted)' }}>
                        Capacity
                      </label>
                      <div className="flex items-center gap-1.5">
                        <Users size={13} style={{ color: 'var(--color-muted)' }} />
                        <span className="font-data font-semibold text-sm"
                          style={{ color: 'var(--color-fg)' }}>
                          {capacity}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {CAPACITY_OPTIONS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setCapacity(c)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all"
                          style={{
                            background: capacity === c ? 'var(--color-surface-2)' : 'var(--color-surface)',
                            borderColor: capacity === c ? 'var(--color-fg)' : 'var(--color-border)',
                            color: capacity === c ? 'var(--color-fg)' : 'var(--color-muted)',
                          }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-mono uppercase tracking-widest"
                        style={{ color: 'var(--color-muted)' }}>
                        Duration
                      </label>
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} style={{ color: 'var(--color-muted)' }} />
                        <span className="font-data font-semibold text-sm"
                          style={{ color: 'var(--color-fg)' }}>
                          {duration}m
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {DURATION_OPTIONS.map((d) => (
                        <button
                          key={d}
                          onClick={() => setDuration(d)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all"
                          style={{
                            background: duration === d ? 'var(--color-surface-2)' : 'var(--color-surface)',
                            borderColor: duration === d ? 'var(--color-fg)' : 'var(--color-border)',
                            color: duration === d ? 'var(--color-fg)' : 'var(--color-muted)',
                          }}
                        >
                          {d}m
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visibility */}
                  <div>
                    <label className="text-xs font-mono uppercase tracking-widest block mb-3"
                      style={{ color: 'var(--color-muted)' }}>
                      Visibility
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { val: 'public' as const, icon: Globe, label: 'Public', desc: 'Anyone can discover and join' },
                        { val: 'invite' as const, icon: Lock, label: 'Invite only', desc: 'Only people you invite can join' },
                      ]).map(({ val, icon: Icon, label, desc }) => (
                        <button
                          key={val}
                          onClick={() => setVisibility(val)}
                          className="text-left p-4 rounded-xl border transition-all"
                          style={{
                            background: visibility === val ? 'var(--color-surface-2)' : 'var(--color-surface)',
                            borderColor: visibility === val ? 'var(--color-fg)' : 'var(--color-border)',
                          }}
                        >
                          <Icon size={16} className="mb-2"
                            style={{ color: visibility === val ? 'var(--color-signal)' : 'var(--color-muted)' }} />
                          <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--color-fg)' }}>
                            {label}
                          </p>
                          <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>{desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Tools */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <p className="font-mono text-xs uppercase tracking-widest mb-3"
                  style={{ color: 'var(--color-signal)' }}>
                  Step 4 — Optional tools
                </p>
                <h2 className="font-display text-3xl md:text-4xl font-semibold mb-8"
                  style={{ color: 'var(--color-fg)' }}>
                  Equip your
                  <br />space.
                </h2>

                <div className="space-y-3">
                  {TOOLS.map((tool) => {
                    const active = tools.includes(tool.id)
                    return (
                      <motion.button
                        key={tool.id}
                        onClick={() => toggleTool(tool.id)}
                        whileHover={{ scale: 1.005 }}
                        className="w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4"
                        style={{
                          background: active ? 'var(--color-surface-2)' : 'var(--color-surface)',
                          borderColor: active ? 'var(--color-signal)' : 'var(--color-border)',
                        }}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: active ? 'var(--color-signal-soft)' : 'var(--color-surface-3)',
                          }}>
                          <tool.icon size={18}
                            style={{ color: active ? 'var(--color-signal)' : 'var(--color-muted)' }}
                            strokeWidth={1.5} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm" style={{ color: 'var(--color-fg)' }}>
                            {tool.label}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                            {tool.desc}
                          </p>
                        </div>
                        <div className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0"
                          style={{
                            background: active ? 'var(--color-signal)' : 'transparent',
                            borderColor: active ? 'var(--color-signal)' : 'var(--color-border)',
                          }}>
                          {active && <Check size={11} color="white" strokeWidth={3} />}
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 4: Launch */}
            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                {launching ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-6"
                  >
                    <div className="relative">
                      <motion.div
                        className="w-20 h-20 rounded-full"
                        style={{ background: (() => {
                          const rt = ROOM_TYPES.find(r => r.type === type)
                          return rt?.bg ?? 'var(--color-surface-2)'
                        })() }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        {type && (() => {
                          const rt = ROOM_TYPES.find(r => r.type === type)!
                          return <rt.icon size={32} style={{ color: rt.color }} strokeWidth={1.5} />
                        })()}
                      </div>
                    </div>
                    <p className="font-display text-2xl font-semibold" style={{ color: 'var(--color-fg)' }}>
                      Forming your space…
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                      Setting up "{title}"
                    </p>
                  </motion.div>
                ) : (
                  <>
                    <p className="font-mono text-xs uppercase tracking-widest mb-3"
                      style={{ color: 'var(--color-signal)' }}>
                      Ready to launch
                    </p>
                    <h2 className="font-display text-3xl md:text-4xl font-semibold mb-8"
                      style={{ color: 'var(--color-fg)' }}>
                      Your space
                      <br />is ready.
                    </h2>

                    {/* Summary */}
                    {type && (() => {
                      const rt = ROOM_TYPES.find(r => r.type === type)!
                      return (
                        <div className="text-left rounded-2xl border p-6 mb-8 mx-auto max-w-md"
                          style={{ background: rt.bg, borderColor: `${rt.color}40` }}>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ background: `${rt.color}20` }}>
                              <rt.icon size={20} style={{ color: rt.color }} strokeWidth={1.5} />
                            </div>
                            <div>
                              <p className="font-semibold" style={{ color: 'var(--color-fg)' }}>{title}</p>
                              <p className="text-xs font-mono" style={{ color: rt.color }}>{rt.type} · {category}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-5 mb-4">
                            <div>
                              <p className="font-data text-lg font-semibold" style={{ color: 'var(--color-fg)' }}>{capacity}</p>
                              <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>capacity</p>
                            </div>
                            <div>
                              <p className="font-data text-lg font-semibold" style={{ color: 'var(--color-fg)' }}>{duration}m</p>
                              <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>duration</p>
                            </div>
                            <div>
                              <p className="font-data text-lg font-semibold capitalize" style={{ color: 'var(--color-fg)' }}>{visibility}</p>
                              <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>visibility</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {tools.map((t) => {
                              const tool = TOOLS.find(x => x.id === t)
                              return tool ? (
                                <span key={t} className="text-[10px] px-2 py-1 rounded-md"
                                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-fg)' }}>
                                  {tool.label}
                                </span>
                              ) : null
                            })}
                          </div>
                        </div>
                      )
                    })()}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          {!launching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-8"
            >
              {errorMsg && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs">
                  {errorMsg}
                </div>
              )}
              <div className="flex items-center gap-3">
                {step < STEPS.length - 1 ? (
                  <button
                    onClick={handleNext}
                    disabled={!canProceed}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all disabled:opacity-40"
                    style={{ background: 'var(--color-signal)', color: 'white' }}
                  >
                    Continue
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleLaunch}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all shadow-lg"
                    style={{ background: 'var(--color-signal)', color: 'white' }}
                  >
                    <Check size={18} />
                    <span>Launch space</span>
                  </button>
                )}
                <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                  Step {step + 1} of {STEPS.length} · {STEPS[step]}
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
