import { useMemo, useState } from 'react'
import {
  ReactFlow, Background, BackgroundVariant, type Node, type Edge, MarkerType,
  type Connection as FlowConnection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useAppStore } from '@/store/useAppStore'
import type { Room, ThoughtRelationship, Thought } from '@/types'
import { ThoughtNode, type ThoughtNodeData } from './ThoughtNode'
import { ConnectFlow } from './ConnectFlow'

const nodeTypes = { thought: ThoughtNode }

const RELATIONSHIP_STYLE: Record<ThoughtRelationship, { color: string; dash?: string; label: string }> = {
  'builds-on': { color: 'var(--color-signal)', label: 'builds on' },
  'relates-to': { color: 'var(--color-resonance)', label: 'relates to' },
  challenges: { color: '#B3261E', dash: '4 4', label: 'challenges' },
  extends: { color: '#3E4C8A', label: 'extends' },
}

function radialPosition(i: number, total: number) {
  const angle = (i / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2
  const radius = 220 + (i % 2) * 70
  return { x: 380 + Math.cos(angle) * radius, y: 300 + Math.sin(angle) * radius }
}

export function ThoughtGraph({ room }: { room: Room }) {
  const connectThoughts = useAppStore((s) => s.connectThoughts)

  const [connectSource, setConnectSource] = useState<Thought | null>(null)
  const [connectTarget, setConnectTarget] = useState<Thought | null>(null)

  const { nodes, edges } = useMemo(() => {
    const byId = (id: string) => room.participants.find((p) => p.id === id)
    const nodes: Node<ThoughtNodeData>[] = room.thoughts.map((t, i) => {
      const author = byId(t.authorId)
      const pos = radialPosition(i, room.thoughts.length)
      return {
        id: t.id,
        type: 'thought',
        position: pos,
        data: {
          thoughtId: t.id,
          text: t.text,
          authorName: author?.name ?? 'Someone',
          authorInitials: author?.initials ?? '??',
          colorSeed: author?.colorSeed ?? 0,
          reactionCount: t.reactions.reduce((a, r) => a + r.count, 0),
          isSelf: author?.isSelf,
          type: t.type,
          isPriority: t.isPriority,
        },
        draggable: true,
      }
    })

    const edges: Edge[] = room.connections.map((c) => {
      const style = RELATIONSHIP_STYLE[c.relationship] || RELATIONSHIP_STYLE['relates-to']
      return {
        id: c.id,
        source: c.fromThoughtId,
        target: c.toThoughtId,
        label: style.label,
        animated: true,
        style: { stroke: style.color, strokeWidth: 2, strokeDasharray: style.dash },
        labelStyle: { fontSize: 10, fill: style.color, fontFamily: 'var(--font-mono)', fontWeight: 600 },
        labelBgStyle: { fill: 'var(--color-bg)', fillOpacity: 0.9 },
        markerEnd: { type: MarkerType.ArrowClosed, color: style.color, width: 14, height: 14 },
      }
    })

    return { nodes, edges }
  }, [room.thoughts, room.connections, room.participants])

  // Drag handle to connect
  function handleConnect(connection: FlowConnection) {
    if (!connection.source || !connection.target || connection.source === connection.target) return
    const src = room.thoughts.find((t) => t.id === connection.source)
    const tgt = room.thoughts.find((t) => t.id === connection.target)
    if (src && tgt) {
      setConnectSource(src)
      setConnectTarget(tgt)
    }
  }

  function finishConnect(rel: ThoughtRelationship) {
    if (connectSource && connectTarget) {
      connectThoughts(connectSource.id, connectTarget.id, rel)
    }
    setConnectSource(null)
    setConnectTarget(null)
  }

  return (
    <div className="h-full w-full relative bg-[var(--color-bg)]">
      {/* Header Info Banner */}
      <div className="absolute top-4 left-6 z-10 flex items-center gap-3">
        <div className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted)] bg-[var(--color-surface)]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[var(--color-border)] shadow-xs">
          {room.thoughts.length} thoughts • {room.connections.length} connections • Drag dot to connect
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onConnect={handleConnect}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={true}
        panOnScroll
        zoomOnScroll={false}
        minZoom={0.4}
        maxZoom={1.6}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--color-border)" />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-1.5 bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-[11px] shadow-lg">
        <span className="text-[10px] font-mono text-[var(--color-muted)] uppercase tracking-wider mb-0.5">
          Connection Spectrum
        </span>
        {Object.entries(RELATIONSHIP_STYLE).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="w-4 h-[2px] rounded-full" style={{ background: v.color }} />
            <span className="text-[var(--color-fg)] font-medium">{v.label}</span>
          </div>
        ))}
      </div>

      {/* Connect Modal when dragged */}
      <ConnectFlow
        sourceThought={connectSource}
        targetThought={connectTarget}
        onChooseRelationship={finishConnect}
        onCancel={() => {
          setConnectSource(null)
          setConnectTarget(null)
        }}
      />
    </div>
  )
}
