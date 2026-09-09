import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Radio, Mic, Video, MessageSquare, Users, Zap } from 'lucide-react'

const LIVE_STATS = [
  { value: '214', label: 'minds live' },
  { value: '31', label: 'active rooms' },
  { value: '892', label: 'signals today' },
]

const ROOM_TYPES = [
  {
    type: 'text',
    icon: MessageSquare,
    label: 'Text Rooms',
    color: 'var(--color-text-room)',
    bg: 'var(--color-text-room-soft)',
    desc: 'Deep async thought exchange',
    rooms: ['React Hooks', 'AI & LLMs', 'Life Discussions'],
    minds: [7, 42, 13],
  },
  {
    type: 'audio',
    icon: Mic,
    label: 'Audio Rooms',
    color: 'var(--color-audio-room)',
    bg: 'var(--color-audio-room-soft)',
    desc: 'Live voice conversations',
    rooms: ['Startups', 'Music', 'Study Sessions'],
    minds: [9, 18, 11],
  },
  {
    type: 'video',
    icon: Video,
    label: 'Video Rooms',
    color: 'var(--color-video-room)',
    bg: 'var(--color-video-room-soft)',
    desc: 'Face-to-face social presence',
    rooms: ['Design', 'Gaming', 'College Life'],
    minds: [6, 24, 31],
  },
]

const PARADIGM_SHIFTS = [
  { from: 'Permanent profiles', to: 'Live intent' },
  { from: 'Infinite feed', to: 'Ephemeral moments' },
  { from: 'Generic likes', to: 'Meaningful reactions' },
  { from: 'Follower graph', to: 'Thought graph' },
  { from: 'Content platforms', to: 'Presence spaces' },
  { from: 'Broadcasting to audiences', to: 'Finding your wavelength' },
]

// Waveform bars — animated SVG component
function Waveform({ n = 40, color = 'var(--color-signal)' }: { n?: number; color?: string }) {
  return (
    <div className="flex items-center gap-[3px]" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => {
        const h = 10 + Math.random() * 40
        const dur = 0.8 + Math.random() * 0.8
        const delay = Math.random() * 0.8
        return (
          <div
            key={i}
            className="animate-wave-bar rounded-sm"
            style={{
              width: 3,
              height: `${h}px`,
              background: color,
              opacity: 0.5 + Math.random() * 0.5,
              '--duration': `${dur}s`,
              '--delay': `${delay}s`,
            } as React.CSSProperties}
          />
        )
      })}
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen overflow-hidden relative" style={{ background: 'var(--color-bg)' }}>
      {/* ── Ambient Background Video ────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <video
          src="/background.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F]/85 via-[#0A0A0F]/75 to-[#0A0A0F]/95" />
      </div>

      <div className="relative z-10">
        {/* Top nav */}
        <header className="relative z-20 flex items-center justify-between px-6 md:px-10 py-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--color-signal)' }}>
            <Radio size={16} color="white" strokeWidth={2} />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight"
            style={{ color: 'var(--color-fg)' }}>
            SameWave
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/home')}
            className="text-sm font-medium transition-colors hidden sm:block"
            style={{ color: 'var(--color-muted)' }}
          >
            Explore rooms
          </button>
          <button
            onClick={() => navigate('/intent')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: 'var(--color-signal)', color: 'white' }}
          >
            Get started
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 md:px-10 pt-10 md:pt-16 pb-20 overflow-hidden">
        {/* Background waveform decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute bottom-0 left-0 right-0 h-32 opacity-30 flex items-end justify-center overflow-hidden">
            <Waveform n={80} color="var(--color-signal)" />
          </div>
          <div className="absolute inset-0 dot-grid opacity-40" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Live stats pill */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-4 px-4 py-2 rounded-full border mb-10"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: 'var(--color-signal)' }} />
              <span className="relative inline-flex rounded-full h-2 w-2"
                style={{ background: 'var(--color-signal)' }} />
            </span>
            {LIVE_STATS.map((stat, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="font-data font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>
                  {stat.value}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  {stat.label}
                </span>
                {i < LIVE_STATS.length - 1 && (
                  <span className="ml-1.5" style={{ color: 'var(--color-border)' }}>·</span>
                )}
              </span>
            ))}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-5xl md:text-7xl lg:text-8xl font-semibold leading-[0.92] tracking-tight max-w-4xl mb-6"
            style={{ color: 'var(--color-fg)' }}
          >
            Social media
            <br />
            <span className="text-gradient-signal">without the feed.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl leading-relaxed max-w-2xl mb-12"
            style={{ color: 'var(--color-muted)' }}
          >
            SameWave finds people thinking about the same thing as you — right now.
            Text rooms, audio rooms, video rooms. Thoughts that connect.
            Moments that close when the conversation ends.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
          >
            <button
              onClick={() => navigate('/intent')}
              className="flex items-center gap-2.5 px-7 py-4 rounded-xl text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'var(--color-signal)', color: 'white' }}
            >
              <Radio size={18} strokeWidth={2} />
              What are you here for?
            </button>
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: 'var(--color-muted)' }}
            >
              <Users size={16} />
              Browse what's live →
            </button>
          </motion.div>
        </div>
      </section>

      {/* Room types */}
      <section className="px-6 md:px-10 py-16 md:py-24 border-t"
        style={{ borderColor: 'var(--color-border)' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <p className="font-mono text-xs uppercase tracking-widest mb-4"
              style={{ color: 'var(--color-muted)' }}>
              Three ways to connect
            </p>
            <h2 className="font-display text-3xl md:text-5xl font-semibold max-w-2xl leading-tight"
              style={{ color: 'var(--color-fg)' }}>
              The right format for every kind of conversation.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ROOM_TYPES.map((rt, i) => (
              <motion.div
                key={rt.type}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-2xl p-6 border cursor-pointer group transition-all hover:scale-[1.01]"
                style={{
                  background: rt.bg,
                  borderColor: `${rt.color}30`,
                }}
                onClick={() => navigate('/home')}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${rt.color}20`, border: `1px solid ${rt.color}40` }}>
                    <rt.icon size={20} style={{ color: rt.color }} strokeWidth={1.5} />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest"
                    style={{ color: rt.color }}>
                    Live
                  </span>
                </div>
                <h3 className="font-display text-xl font-semibold mb-1"
                  style={{ color: 'var(--color-fg)' }}>
                  {rt.label}
                </h3>
                <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
                  {rt.desc}
                </p>
                <div className="space-y-2">
                  {rt.rooms.map((room, j) => (
                    <div key={j} className="flex items-center justify-between py-1.5 px-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <span className="text-xs font-medium" style={{ color: 'var(--color-fg)' }}>
                        {room}
                      </span>
                      <span className="flex items-center gap-1 text-[11px]"
                        style={{ color: 'var(--color-muted)' }}>
                        <Users size={10} />
                        {rt.minds[j]}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Paradigm shift — scrolling ticker */}
      <section className="border-y py-6 overflow-hidden"
        style={{ borderColor: 'var(--color-border)' }}>
        <motion.div
          animate={{ x: [0, -1200] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="flex items-center gap-10 whitespace-nowrap"
        >
          {[...PARADIGM_SHIFTS, ...PARADIGM_SHIFTS].map((shift, i) => (
            <div key={i} className="flex items-center gap-4 shrink-0">
              <span className="text-sm line-through" style={{ color: 'var(--color-muted)', textDecorationColor: 'var(--color-muted)' }}>
                {shift.from}
              </span>
              <ArrowRight size={14} style={{ color: 'var(--color-signal)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--color-fg)' }}>
                {shift.to}
              </span>
              <span className="w-1 h-1 rounded-full" style={{ background: 'var(--color-border)' }} />
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 md:px-10 py-16 md:py-24 border-b"
        style={{ borderColor: 'var(--color-border)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="font-mono text-xs uppercase tracking-widest mb-4"
                style={{ color: 'var(--color-signal)' }}>
                Thought graph
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-semibold mb-6 leading-tight"
                style={{ color: 'var(--color-fg)' }}>
                Ideas that connect,
                <br />not just react.
              </h2>
              <p className="leading-relaxed mb-8" style={{ color: 'var(--color-muted)' }}>
                Every thought can be explicitly connected to another —
                "builds on", "relates to", "challenges". The result is a living
                constellation of ideas, not a comment thread.
              </p>
              <div className="space-y-3">
                {['builds on', 'relates to', 'challenges', 'extends'].map((rel, i) => {
                  const colors = [
                    'var(--color-signal)',
                    'var(--color-resonance)',
                    '#C4392F',
                    'var(--color-text-room)',
                  ]
                  return (
                    <div key={rel} className="flex items-center gap-3">
                      <div className="w-6 h-[2px] rounded-full" style={{ background: colors[i] }} />
                      <span className="text-sm font-mono" style={{ color: 'var(--color-muted)' }}>
                        {rel}
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Mock constellation preview */}
              <div className="aspect-square rounded-2xl border dot-grid relative overflow-hidden"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                {[
                  { x: '50%', y: '30%', size: 10, color: 'var(--color-signal)' },
                  { x: '75%', y: '55%', size: 8, color: 'var(--color-text-room)' },
                  { x: '25%', y: '55%', size: 9, color: 'var(--color-resonance)' },
                  { x: '60%', y: '70%', size: 7, color: 'var(--color-audio-room)' },
                  { x: '35%', y: '25%', size: 8, color: 'var(--color-signal)' },
                ].map((node, i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full animate-float"
                    style={{
                      left: node.x,
                      top: node.y,
                      width: node.size * 4,
                      height: node.size * 4,
                      background: node.color,
                      transform: 'translate(-50%, -50%)',
                      opacity: 0.8,
                      animationDelay: `${i * 0.6}s`,
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.1, type: 'spring' }}
                  />
                ))}
                <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
                  <line x1="50%" y1="30%" x2="75%" y2="55%" stroke="var(--color-signal)" strokeWidth="1" opacity="0.4" strokeDasharray="4 4" />
                  <line x1="50%" y1="30%" x2="25%" y2="55%" stroke="var(--color-resonance)" strokeWidth="1" opacity="0.4" strokeDasharray="4 4" />
                  <line x1="25%" y1="55%" x2="60%" y2="70%" stroke="var(--color-text-room)" strokeWidth="1" opacity="0.3" strokeDasharray="4 4" />
                  <line x1="35%" y1="25%" x2="50%" y2="30%" stroke="var(--color-signal)" strokeWidth="1" opacity="0.3" strokeDasharray="4 4" />
                </svg>
                <div className="absolute bottom-6 left-6 right-6">
                  <Waveform n={20} color="var(--color-signal)" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Daily Signals preview */}
      <section className="px-6 md:px-10 py-16 md:py-24 border-b"
        style={{ borderColor: 'var(--color-border)' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10"
          >
            <p className="font-mono text-xs uppercase tracking-widest mb-4"
              style={{ color: 'var(--color-muted)' }}>
              Daily Signals
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold max-w-xl leading-tight"
              style={{ color: 'var(--color-fg)' }}>
              One thought. Once a day. Meaningful reactions.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { text: 'Small progress is still progress. Ship the imperfect thing.', author: 'Riya', reactions: 24 },
              { text: 'Build before you optimize. Most optimizations are premature.', author: 'Kabir', reactions: 38 },
              { text: "Sitting with uncertainty is a skill. I'm still learning it.", author: 'Meera', reactions: 47 },
            ].map((signal, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl border"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <p className="font-display text-lg leading-snug mb-5"
                  style={{ color: 'var(--color-fg)' }}>
                  "{signal.text}"
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold"
                      style={{ background: 'var(--color-signal)', color: 'white' }}>
                      {signal.author[0]}
                    </div>
                    <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      {signal.author}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap size={12} style={{ color: 'var(--color-signal)' }} />
                    <span className="text-xs font-data"
                      style={{ color: 'var(--color-muted)' }}>
                      {signal.reactions} resonated
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-10 py-24 md:py-32">
        <div className="max-w-6xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-4xl md:text-6xl font-semibold mb-6"
            style={{ color: 'var(--color-fg)' }}
          >
            What are you
            <br />
            <span className="text-gradient-signal">into right now?</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg mb-10 max-w-md mx-auto"
            style={{ color: 'var(--color-muted)' }}
          >
            Set your wavelength. Find your room. Connect your thoughts.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => navigate('/intent')}
              className="flex items-center gap-2.5 px-8 py-4 rounded-xl text-base font-semibold transition-all hover:scale-[1.02]"
              style={{ background: 'var(--color-signal)', color: 'white' }}
            >
              <Radio size={18} />
              Set your intent
            </button>
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-medium border transition-all"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-muted)',
                background: 'var(--color-surface)',
              }}
            >
              Browse live rooms →
            </button>
          </motion.div>
        </div>
      </section>
      </div>
    </div>
  )
}
