import type { Participant, Thought, ThoughtConnection } from '@/types'

const NAMES = [
  'Riya', 'Aarav', 'Meera', 'Kabir', 'Ishaan', 'Ananya',
  'Vihaan', 'Sara', 'Dev', 'Nisha', 'Arjun', 'Priya',
]

export function makeParticipants(count: number): Participant[] {
  const shuffled = [...NAMES].sort(() => Math.random() - 0.5)
  const people: Participant[] = shuffled.slice(0, Math.min(count, NAMES.length)).map((name, i) => ({
    id: `p-${i}`,
    name,
    initials: name.slice(0, 2).toUpperCase(),
    colorSeed: i,
    presenceState: 'active' as const,
    isMuted: i % 4 === 2,
    hasVideo: i % 5 !== 1,
    handRaised: false,
  }))
  people.push({
    id: 'self',
    name: 'You',
    initials: 'YOU',
    colorSeed: 99,
    isSelf: true,
    presenceState: 'active',
    isMuted: false,
    hasVideo: true,
    handRaised: false,
  })
  return people
}

const SEED_TEXTS: Record<string, string[]> = {
  'react-hooks': [
    "I'm still confused about when useEffect actually re-runs.",
    'Building a habit tracker with useReducer instead of five useStates.',
    "Can someone explain dependency arrays like I'm five?",
    'useMemo saved my render performance today, finally clicked.',
    'Custom hooks changed how I structure entire features.',
    'The rules of hooks feel arbitrary until you understand closures.',
  ],
  'ai-llms': [
    'Is prompt engineering a real long-term skill or a phase?',
    'Got RAG working on my side project this weekend.',
    'Local models are good enough for most of what I need now.',
    'Struggling to explain to my parents what I actually do.',
    'Context windows keep growing but retrieval still matters.',
    'Fine-tuning vs few-shot — when do you actually need to fine-tune?',
  ],
  startups: [
    'How do you validate an idea before writing a single line of code?',
    'Co-founder search is somehow harder than the fundraising itself.',
    'Bootstrapping vs raising — anyone regret their choice?',
    'First paying customer felt better than any metric before it.',
    'Pivoted twice this year and finally feel like it fits.',
    'The best product is not always the winning product.',
  ],
  'dev-tools': [
    'What terminal setup is everyone actually using these days?',
    'Moved my team to a monorepo, zero regrets so far.',
    'CLI tools with sane defaults are wildly underrated.',
    'Debugging with print statements is still underrated too honestly.',
    'Finally automated my whole release pipeline this week.',
    'The best abstractions are the ones you stop noticing.',
  ],
  design: [
    'Trying to unlearn centered-hero-syndrome in every layout.',
    'What actually makes a layout feel spatial instead of flat?',
    'Type scale is doing 80% of the work in my current redesign.',
    'Negative space is the hardest thing to defend in a review.',
    'Started designing in grayscale first, color comes last now.',
    'The interface should get out of the way of the experience.',
  ],
  music: [
    'What is everyone playing on repeat this week?',
    'Producing my first EP and mildly terrified honestly.',
    'Live gigs over studio work, always, no contest for me.',
    'Found an artist through a random playlist, obsessed now.',
    'Learning guitar at 24, it is humbling in the best way.',
  ],
  gaming: [
    'Still not over that ending, need to talk about it.',
    'Looking for a co-op partner this weekend, anyone free?',
    'Indie games are quietly carrying this whole year.',
    'Finally beat the boss I was stuck on for two weeks.',
    'Controller or keyboard, be honest, no wrong answer here.',
  ],
  'college-life': [
    'Finals week survival tips, go, I need all of them.',
    "Is anyone else's hostel wifi actively hostile to them?",
    'How do you pick electives without regretting it by week three?',
    'Group projects are a personality test disguised as coursework.',
    'Made it through the semester on canteen coffee, barely.',
  ],
  study: [
    'Need someone to study with, pomodoro style, tonight.',
    'Anki or handwritten notes, fight me in the replies.',
    'Studying DBMS tonight, misery loves company apparently.',
    'Found a study rhythm that finally sticks, thirty five minutes.',
    'Explaining a concept out loud is still the best test.',
  ],
  'life-talk': [
    'How do you actually build a habit that survives a bad week?',
    'Feeling behind compared to everyone else lately, is that normal?',
    'What does figuring your life out even mean at twenty?',
    'Small consistent choices beat big dramatic resets, mostly.',
    'Learning to sit with uncertainty instead of rushing past it.',
  ],
}

const SIMULATED_NEW_THOUGHTS: string[] = [
  'Just tried what someone suggested — actually worked.',
  'Has anyone read something good on this lately?',
  'Came here with a question and left with three more.',
  'This is exactly the conversation I needed today.',
  'Switching from "how do I fix this" to "why does this happen" was everything.',
  'The community around this topic is underrated.',
  'Anyone else find that talking through a problem is often enough to solve it?',
]

export function getRandomSimulatedThought(): string {
  return SIMULATED_NEW_THOUGHTS[Math.floor(Math.random() * SIMULATED_NEW_THOUGHTS.length)]
}

export function makeThoughts(topicId: string, participants: Participant[], count = 5): Thought[] {
  const texts = SEED_TEXTS[topicId] ?? SEED_TEXTS['life-talk']
  const others = participants.filter((p) => !p.isSelf)
  return texts.slice(0, count).map((text, i) => ({
    id: `t-${topicId}-${i}`,
    authorId: others[i % others.length]?.id ?? 'p-0',
    type: 'thought' as const,
    text,
    createdAt: Date.now() - (count - i) * 45000,
    reactions: [
      { type: 'relate' as const, count: Math.floor(Math.random() * 5) },
      { type: 'made-me-think' as const, count: Math.floor(Math.random() * 3) },
      { type: 'tell-me-more' as const, count: Math.floor(Math.random() * 2) },
      { type: 'different-take' as const, count: Math.floor(Math.random() * 2) },
      { type: 'inspired' as const, count: Math.floor(Math.random() * 2) },
      { type: 'made-me-pause' as const, count: Math.floor(Math.random() * 2) },
    ],
  }))
}

export function makeSeedConnections(thoughts: Thought[]): ThoughtConnection[] {
  if (thoughts.length < 4) return []
  return [
    {
      id: 'c-0',
      fromThoughtId: thoughts[1].id,
      toThoughtId: thoughts[0].id,
      relationship: 'builds-on',
    },
    {
      id: 'c-1',
      fromThoughtId: thoughts[3].id,
      toThoughtId: thoughts[2].id,
      relationship: 'relates-to',
    },
  ]
}
