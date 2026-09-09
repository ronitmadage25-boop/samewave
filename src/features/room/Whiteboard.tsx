import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Pen, Highlighter, Eraser, RotateCcw, Trash2, Download, MousePointer2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { WhiteboardStroke, WhiteboardTool, RemoteCursor } from '@/types'

const PALETTE = [
  '#E8542A', // Signal orange
  '#4A7FA5', // Blue
  '#7C4AB5', // Purple
  '#2E7D5E', // Green
  '#E5A93C', // Amber
  '#F4F4F6', // Off-white
  '#8B8A95', // Gray
  '#16161C', // Dark
]

const WIDTHS = [2, 5, 12, 24]

export function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const room = useAppStore((s) => s.activeRoom)
  const addStroke = useAppStore((s) => s.addStroke)
  const undoStroke = useAppStore((s) => s.undoStroke)
  const clearWhiteboard = useAppStore((s) => s.clearWhiteboard)

  const [currentTool, setCurrentTool] = useState<WhiteboardTool>('pen')
  const [currentColor, setCurrentColor] = useState<string>('#E8542A')
  const [currentWidth, setCurrentWidth] = useState<number>(4)
  const [isDrawing, setIsDrawing] = useState(false)
  const [activeStrokeId, setActiveStrokeId] = useState<string | null>(null)
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([])

  const strokes = room?.whiteboard || []
  const currentStrokePoints = useRef<{ x: number; y: number }[]>([])

  // Simulated remote cursors for feeling alive
  useEffect(() => {
    if (!room) return
    const others = room.participants.filter((p) => !p.isSelf)
    if (others.length === 0) return

    const timer = setInterval(() => {
      // Pick 1 or 2 remote users and move their cursor
      const activePartner = others[Math.floor(Math.random() * others.length)]
      if (activePartner) {
        setRemoteCursors((prev) => {
          const filtered = prev.filter((c) => c.participantId !== activePartner.id)
          // 80% chance to show cursor, 20% to leave canvas
          if (Math.random() < 0.8) {
            const nextCursor: RemoteCursor = {
              participantId: activePartner.id,
              name: activePartner.name,
              color: PALETTE[activePartner.colorSeed % PALETTE.length],
              x: 100 + Math.random() * 600,
              y: 80 + Math.random() * 400,
            }
            return [...filtered, nextCursor]
          }
          return filtered
        })
      }
    }, 2400)

    return () => clearInterval(timer)
  }, [room])

  // Canvas redraw helper
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Render strokes
    for (const stroke of strokes) {
      if (!stroke.points || stroke.points.length < 2) continue

      ctx.beginPath()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = stroke.tool === 'marker' ? 0.45 : stroke.tool === 'eraser' ? 1 : 0.95

      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
      } else {
        ctx.globalCompositeOperation = 'source-over'
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
      }
      ctx.stroke()
    }

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  }, [strokes])

  // Redraw when strokes change
  useEffect(() => {
    redraw()
  }, [strokes, redraw])

  // Resize canvas to match display size
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const updateSize = () => {
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
      redraw()
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [redraw])

  // Mouse / Touch handlers
  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0]
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  function handleStartDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const pos = getCanvasPos(e)
    const id = `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    currentStrokePoints.current = [pos]
    setIsDrawing(true)
    setActiveStrokeId(id)

    const newStroke: WhiteboardStroke = {
      id,
      participantId: 'user-self',
      tool: currentTool,
      color: currentTool === 'eraser' ? '#000000' : currentColor,
      width: currentWidth,
      points: [pos],
      completed: false,
    }
    addStroke(newStroke)
  }

  function handleDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing || !activeStrokeId) return
    e.preventDefault()
    const pos = getCanvasPos(e)
    currentStrokePoints.current.push(pos)

    // Direct canvas preview for zero latency
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx && currentStrokePoints.current.length >= 2) {
        const pts = currentStrokePoints.current
        ctx.beginPath()
        ctx.strokeStyle = currentTool === 'eraser' ? '#000000' : currentColor
        ctx.lineWidth = currentWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.globalAlpha = currentTool === 'marker' ? 0.45 : 1
        if (currentTool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out'
        } else {
          ctx.globalCompositeOperation = 'source-over'
        }
        ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y)
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
        ctx.stroke()
        ctx.globalCompositeOperation = 'source-over'
      }
    }
  }

  function handleEndDraw() {
    if (!isDrawing || !activeStrokeId) return
    setIsDrawing(false)

    // Update the stroke in store with all completed points
    const pts = [...currentStrokePoints.current]
    if (pts.length > 0) {
      const updatedStroke: WhiteboardStroke = {
        id: activeStrokeId,
        participantId: 'user-self',
        tool: currentTool,
        color: currentTool === 'eraser' ? '#000000' : currentColor,
        width: currentWidth,
        points: pts,
        completed: true,
      }
      addStroke(updatedStroke)
    }

    setActiveStrokeId(null)
    currentStrokePoints.current = []
  }

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `samewave-canvas-${room?.topicId || 'sketch'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[var(--color-bg)]">
      {/* Grid background texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(var(--color-border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Main interactive Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleStartDraw}
        onMouseMove={handleDrawing}
        onMouseUp={handleEndDraw}
        onMouseLeave={handleEndDraw}
        onTouchStart={handleStartDraw}
        onTouchMove={handleDrawing}
        onTouchEnd={handleEndDraw}
        className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
      />

      {/* Simulated Remote Cursors */}
      {remoteCursors.map((cursor) => (
        <motion.div
          key={cursor.participantId}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1, x: cursor.x, y: cursor.y }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute pointer-events-none z-20 flex items-center gap-1.5"
        >
          <MousePointer2
            size={16}
            style={{ color: cursor.color, fill: cursor.color }}
            className="drop-shadow"
          />
          <span
            className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded shadow-sm text-white"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name}
          </span>
        </motion.div>
      ))}

      {/* Whiteboard Floating Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl backdrop-blur-md">
        {/* Tool selector */}
        <div className="flex items-center gap-1 border-r border-[var(--color-border)] pr-2">
          <button
            onClick={() => setCurrentTool('pen')}
            className={`p-2 rounded-lg text-xs flex items-center gap-1 transition-all ${
              currentTool === 'pen'
                ? 'bg-[var(--color-surface-2)] text-[var(--color-signal)] font-medium shadow-sm'
                : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
            }`}
            title="Pen tool"
          >
            <Pen size={15} />
          </button>
          <button
            onClick={() => setCurrentTool('marker')}
            className={`p-2 rounded-lg text-xs flex items-center gap-1 transition-all ${
              currentTool === 'marker'
                ? 'bg-[var(--color-surface-2)] text-[var(--color-signal)] font-medium shadow-sm'
                : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
            }`}
            title="Highlighter marker"
          >
            <Highlighter size={15} />
          </button>
          <button
            onClick={() => setCurrentTool('eraser')}
            className={`p-2 rounded-lg text-xs flex items-center gap-1 transition-all ${
              currentTool === 'eraser'
                ? 'bg-[var(--color-surface-2)] text-[var(--color-signal)] font-medium shadow-sm'
                : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
            }`}
            title="Eraser tool"
          >
            <Eraser size={15} />
          </button>
        </div>

        {/* Color swatches (hidden if eraser active) */}
        {currentTool !== 'eraser' && (
          <div className="flex items-center gap-1.5 border-r border-[var(--color-border)] pr-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setCurrentColor(c)}
                className={`w-5 h-5 rounded-full transition-transform ${
                  currentColor === c ? 'scale-125 ring-2 ring-[var(--color-signal)] ring-offset-1' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        )}

        {/* Width picker */}
        <div className="flex items-center gap-1.5 border-r border-[var(--color-border)] pr-2">
          {WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => setCurrentWidth(w)}
              className={`w-6 h-6 rounded-md flex items-center justify-center text-xs transition-colors ${
                currentWidth === w ? 'bg-[var(--color-surface-2)] font-bold text-[var(--color-fg)]' : 'text-[var(--color-muted)]'
              }`}
              title={`${w}px width`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: Math.min(14, Math.max(3, w / 2)), height: Math.min(14, Math.max(3, w / 2)) }}
              />
            </button>
          ))}
        </div>

        {/* Actions: Undo, Clear, Export */}
        <div className="flex items-center gap-1">
          <button
            onClick={undoStroke}
            disabled={strokes.length === 0}
            className="p-2 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-fg)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Undo last stroke"
          >
            <RotateCcw size={15} />
          </button>
          <button
            onClick={clearWhiteboard}
            disabled={strokes.length === 0}
            className="p-2 rounded-lg text-[var(--color-muted)] hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Clear canvas"
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors"
            title="Download canvas image"
          >
            <Download size={15} />
          </button>
        </div>
      </div>

      {/* Bottom hint banner */}
      <div className="absolute bottom-4 left-6 pointer-events-none flex items-center gap-3">
        <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--color-muted)] bg-[var(--color-surface)]/80 px-2.5 py-1 rounded border border-[var(--color-border)]">
          Collaborative Canvas • {strokes.length} strokes • Live Sync
        </span>
      </div>
    </div>
  )
}
