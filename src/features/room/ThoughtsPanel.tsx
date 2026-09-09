import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Sparkles, HelpCircle, Code2, Link2, BarChart2,
  Filter, AlertCircle, Plus, Trash2
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Room, Thought, ReactionType, ThoughtRelationship, ThoughtType, PollOption } from '@/types'
import { ThoughtCard } from './ThoughtCard'
import { ConnectFlow } from './ConnectFlow'

export function ThoughtsPanel({ room }: { room: Room }) {
  const addThought = useAppStore((s) => s.addThought)
  const reactToThought = useAppStore((s) => s.reactToThought)
  const connectThoughts = useAppStore((s) => s.connectThoughts)
  const markPriority = useAppStore((s) => s.markPriority)
  const typingParticipantId = useAppStore((s) => s.typingParticipantId)

  // Composer state
  const [activeTab, setActiveTab] = useState<ThoughtType>('thought')
  const [draft, setDraft] = useState('')
  const [codeSnippet, setCodeSnippet] = useState('')
  const [codeLanguage, setCodeLanguage] = useState('typescript')
  const [urlInput, setUrlInput] = useState('')
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])
  const [isPriorityQuestion, setIsPriorityQuestion] = useState(false)

  // Filter state
  const [filterType, setFilterType] = useState<string>('all')

  // Connect state
  const [connectSource, setConnectSource] = useState<Thought | null>(null)
  const [connectTarget, setConnectTarget] = useState<Thought | null>(null)

  const byId = (id: string) => room.participants.find((p) => p.id === id)
  const typingParticipant = typingParticipantId ? byId(typingParticipantId) : null

  function handleSend() {
    if (draft.trim().length < 2 && activeTab !== 'code') return

    if (activeTab === 'thought') {
      addThought(draft.trim(), 'thought')
    } else if (activeTab === 'question') {
      addThought(draft.trim(), 'question')
      // If marked priority, we can mark the newly created thought
      if (isPriorityQuestion) {
        // Will be the latest in thoughts
        setTimeout(() => {
          const currentThoughts = useAppStore.getState().activeRoom?.thoughts || []
          const latest = currentThoughts[currentThoughts.length - 1]
          if (latest) markPriority(latest.id)
        }, 50)
      }
    } else if (activeTab === 'code') {
      addThought(draft.trim() || 'Shared code snippet:', 'code', {
        code: codeSnippet,
        language: codeLanguage,
      })
    } else if (activeTab === 'link') {
      addThought(draft.trim() || urlInput, 'link', {
        url: urlInput.startsWith('http') ? urlInput : `https://${urlInput}`,
      })
    } else if (activeTab === 'poll') {
      const validOptions: PollOption[] = pollOptions
        .filter((o) => o.trim().length > 0)
        .map((label, i) => ({
          id: `opt-${i}-${Date.now()}`,
          label: label.trim(),
          votes: 0,
        }))
      if (validOptions.length >= 2) {
        addThought(draft.trim(), 'poll', {
          pollOptions: validOptions,
        })
      }
    }

    // Reset fields
    setDraft('')
    setCodeSnippet('')
    setUrlInput('')
    setPollOptions(['', ''])
    setIsPriorityQuestion(false)
  }

  function handleAddPollOption() {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, ''])
    }
  }

  function handleRemovePollOption(index: number) {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index))
    }
  }

  function startConnect(t: Thought) {
    setConnectSource(t)
    setConnectTarget(null)
  }

  function pickTarget(t: Thought) {
    if (!connectSource || t.id === connectSource.id) return
    setConnectTarget(t)
  }

  function finishConnect(rel: ThoughtRelationship) {
    if (connectSource && connectTarget) {
      connectThoughts(connectSource.id, connectTarget.id, rel)
    }
    setConnectSource(null)
    setConnectTarget(null)
  }

  // Filtered thoughts
  const displayedThoughts = room.thoughts.filter((t) => {
    if (filterType === 'priority') return t.isPriority
    if (filterType === 'questions') return t.type === 'question'
    if (filterType === 'code') return t.type === 'code'
    if (filterType === 'poll') return t.type === 'poll'
    return true
  })

  const priorityQuestions = room.thoughts.filter((t) => t.isPriority)

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)]">
      {/* Top Filter & Priority Spotlight Bar */}
      <div className="px-4 md:px-6 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto thin-scroll">
          <span className="text-[11px] font-mono text-[var(--color-muted)] flex items-center gap-1 mr-1">
            <Filter size={11} /> Filter:
          </span>
          {[
            { id: 'all', label: `All (${room.thoughts.length})` },
            { id: 'priority', label: `Priority (${priorityQuestions.length})` },
            { id: 'questions', label: 'Questions' },
            { id: 'code', label: 'Code' },
            { id: 'poll', label: 'Polls' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterType === f.id
                  ? 'bg-[var(--color-surface-2)] text-[var(--color-fg)] font-semibold shadow-xs'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {priorityQuestions.length > 0 && filterType !== 'priority' && (
          <button
            onClick={() => setFilterType('priority')}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-medium shrink-0 animate-pulse"
          >
            <AlertCircle size={12} />
            <span>{priorityQuestions.length} Priority Qs</span>
          </button>
        )}
      </div>

      {/* Main Stream of Thoughts */}
      <div className="flex-1 overflow-y-auto thin-scroll px-4 md:px-8 py-5 space-y-4">
        {displayedThoughts.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center text-[var(--color-muted)]">
            <Sparkles size={28} className="mb-2 opacity-50" />
            <p className="text-sm font-medium">No thoughts yet in this view</p>
            <p className="text-xs">Be the first to share an insight, question, or spark</p>
          </div>
        ) : (
          displayedThoughts.map((t) => (
            <ThoughtCard
              key={t.id}
              thought={t}
              author={byId(t.authorId)}
              onReact={(type: ReactionType) => reactToThought(t.id, type)}
              onConnect={connectSource ? () => pickTarget(t) : () => startConnect(t)}
              connectMode={!!connectSource}
              isConnectSource={connectSource?.id === t.id}
              selectable={!!connectSource && connectSource.id !== t.id}
            />
          ))
        )}

        {/* Live Typing Indicator */}
        <AnimatePresence>
          {typingParticipant && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2 text-xs text-[var(--color-muted)] px-3 py-1.5 rounded-lg bg-[var(--color-surface)]/50 border border-[var(--color-border)] w-fit"
            >
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-signal)] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-signal)] animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-signal)] animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="font-medium text-[var(--color-fg)]">{typingParticipant.name}</span>
              <span>is sharing a perspective…</span>
            </motion.div>
          )}
        </AnimatePresence>

        {connectSource && (
          <div className="sticky bottom-2 z-10 p-2.5 rounded-xl bg-[var(--color-signal)] text-white shadow-xl flex items-center justify-between">
            <span className="text-xs font-medium">
              Connecting from: <span className="font-bold">"{connectSource.text.slice(0, 30)}…"</span>
            </span>
            <button
              onClick={() => setConnectSource(null)}
              className="text-xs underline hover:opacity-80 ml-3"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Rich Composer Section */}
      <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:p-4">
        {/* Type Selector Tabs */}
        <div className="flex items-center gap-1 mb-2.5">
          {[
            { id: 'thought' as ThoughtType, label: 'Thought', icon: Sparkles },
            { id: 'question' as ThoughtType, label: 'Question', icon: HelpCircle },
            { id: 'code' as ThoughtType, label: 'Code', icon: Code2 },
            { id: 'link' as ThoughtType, label: 'Link', icon: Link2 },
            { id: 'poll' as ThoughtType, label: 'Poll', icon: BarChart2 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === id
                  ? 'bg-[var(--color-surface-2)] text-[var(--color-signal)] border border-[var(--color-border)] shadow-xs'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
              }`}
            >
              <Icon size={13} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Composer Inputs based on activeTab */}
        <div className="space-y-2">
          {/* Main prompt input */}
          <div className="flex items-center gap-2 border border-[var(--color-border)] rounded-xl px-3 py-2 bg-[var(--color-bg)] focus-within:border-[var(--color-signal)] transition-colors">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && activeTab !== 'code' && activeTab !== 'poll') {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={
                activeTab === 'thought'
                  ? 'Share a thought, revelation, or inquiry…'
                  : activeTab === 'question'
                  ? 'Ask the room a question…'
                  : activeTab === 'code'
                  ? 'Brief explanation of this snippet…'
                  : activeTab === 'link'
                  ? 'Context or title for this link…'
                  : 'Ask a question for the poll…'
              }
              aria-label="Composer input"
              className="flex-1 bg-transparent outline-none text-xs sm:text-sm text-[var(--color-fg)] placeholder-[var(--color-muted)]"
            />

            {/* Quick Submit button */}
            <button
              onClick={handleSend}
              disabled={draft.trim().length < 2 && activeTab !== 'code'}
              aria-label="Send thought"
              className="p-1.5 rounded-lg bg-[var(--color-signal)] text-white hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs"
            >
              <Send size={15} />
            </button>
          </div>

          {/* Sub-inputs: Question Priority Toggle */}
          {activeTab === 'question' && (
            <div className="flex items-center gap-2 pt-1 px-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]">
                <input
                  type="checkbox"
                  checked={isPriorityQuestion}
                  onChange={(e) => setIsPriorityQuestion(e.target.checked)}
                  className="rounded border-[var(--color-border)] text-[var(--color-signal)] focus:ring-0"
                />
                <span className="flex items-center gap-1 font-medium">
                  <AlertCircle size={13} className="text-amber-500" />
                  Mark as Priority Question (pins to attention)
                </span>
              </label>
            </div>
          )}

          {/* Sub-inputs: Code Snippet */}
          {activeTab === 'code' && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[var(--color-muted)]">Language:</span>
                <select
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                  className="text-xs rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-0.5 text-[var(--color-fg)]"
                >
                  <option value="typescript">TypeScript</option>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="rust">Rust</option>
                  <option value="css">CSS</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <textarea
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                placeholder="// Paste code snippet here..."
                rows={4}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2.5 font-mono text-xs text-[var(--color-fg)] outline-none focus:border-[var(--color-signal)] resize-none"
              />
            </div>
          )}

          {/* Sub-inputs: Link URL */}
          {activeTab === 'link' && (
            <div className="pt-1">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-fg)] outline-none focus:border-[var(--color-signal)]"
              />
            </div>
          )}

          {/* Sub-inputs: Poll Options */}
          {activeTab === 'poll' && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-mono text-[var(--color-muted)]">Options:</span>
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={opt}
                    onChange={(e) => {
                      const next = [...pollOptions]
                      next[i] = e.target.value
                      setPollOptions(next)
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-2.5 py-1 text-xs text-[var(--color-fg)] outline-none focus:border-[var(--color-signal)]"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      onClick={() => handleRemovePollOption(i)}
                      className="p-1 text-[var(--color-muted)] hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 5 && (
                <button
                  onClick={handleAddPollOption}
                  className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-signal)] hover:underline pt-1"
                >
                  <Plus size={12} /> Add option
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Connect Confirmation Modal */}
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
