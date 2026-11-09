import type { DayKind } from '../../domain/guide.ts'

// Item ids are the sync keys for ticks: never rename or reuse one.

export interface Item {
  id: string
  label: string
  detail?: string
  /** The app ticks this itself; see autoTicks. */
  auto?: boolean
}

export const START_DAY = '2026-11-07'
export const PLAN_WEEKS = 8

export const stack = [
  ['Words', 'wordwork, 10 new cards a day'],
  ['Course', 'Nicos Weg A1 (DW, free)'],
  ['Grammar', 'Lingolia or Longua, look things up'],
  ['Listening', 'Easy German, German subtitles'],
] as const

export const daily: Record<DayKind, Item[]> = {
  weekday: [
    { id: 'daily.reviews', label: 'wordwork reviews', detail: '10-15 min, never skip', auto: true },
    {
      id: 'daily.course',
      label: 'Nicos Weg episode or a grammar topic',
      detail: '20-25 min, with the exercises',
    },
    {
      id: 'daily.input',
      label: 'Input',
      detail: '15-20 min: Easy German, a slow podcast, an A1 reader',
    },
    {
      id: 'daily.sentence',
      label: 'Sentence of the day',
      detail: '5-10 min in the Journal, said aloud first',
      auto: true,
    },
  ],
  saturday: [
    { id: 'daily.reviews', label: 'wordwork reviews', auto: true },
    { id: 'daily.catch-up', label: 'Catch up on anything missed this week' },
    { id: 'daily.grammar', label: 'One grammar topic in Lingolia, with exercises' },
    { id: 'daily.listening', label: 'Longer listening session', detail: '30 min' },
    { id: 'daily.sentence', label: 'Sentence of the day', auto: true },
  ],
  sunday: [
    { id: 'daily.reviews', label: 'wordwork reviews', detail: '10 min, then rest', auto: true },
    { id: 'daily.song', label: 'Song of the week', detail: 'Pick one in the Journal', auto: true },
  ],
}

export interface Block {
  weeks: [number, number]
  lessons: string
  items: Item[]
}

export const blocks: Block[] = [
  {
    weeks: [1, 2],
    lessons: 'Starter, Numbers and time, Greetings',
    items: [
      { id: 'w1.sounds', label: 'Sounds (see Reference)' },
      { id: 'w1.sein-haben', label: '`sein` and `haben`' },
      { id: 'w1.present', label: 'Regular present tense (`ich lerne, du lernst`)' },
      { id: 'w1.questions', label: 'Yes/no and W-questions' },
      { id: 'w1.numbers', label: 'Numbers' },
      {
        id: 'w1.pronouns',
        label: 'Pronouns, `und/oder/aber`, question words from Nicos Weg',
        detail: 'The Basics lesson that has them comes last in the deck.',
      },
    ],
  },
  {
    weeks: [3, 4],
    lessons: 'People, Food, Home, City',
    items: [
      { id: 'w3.gender-plural', label: 'Noun gender and plural' },
      { id: 'w3.ein-kein', label: '`ein` / `kein`' },
      { id: 'w3.accusative', label: 'Nominative vs accusative (`der` → `den`)' },
      { id: 'w3.verb-second', label: 'Verb in second place' },
    ],
  },
  {
    weeks: [5, 6],
    lessons: 'Shopping, Work, Body, Verbs',
    items: [
      { id: 'w5.modals', label: 'Modal verbs (`können, müssen, wollen, dürfen, möchten`)' },
      { id: 'w5.separable', label: 'Separable verbs (`aufstehen, anrufen`)' },
      { id: 'w5.nicht-kein', label: '`nicht` vs `kein`' },
      { id: 'w5.times', label: 'Times and dates' },
    ],
  },
  {
    weeks: [7, 8],
    lessons: 'Weather, Adjectives, Basics',
    items: [
      { id: 'w7.dative', label: 'First look at dative (`mit, bei, zu`)' },
      { id: 'w7.perfekt', label: 'Perfekt preview (`ich habe gegessen`)' },
      { id: 'w7.nicos-a1', label: 'Finish Nicos Weg A1' },
      { id: 'w7.model-paper', label: 'Goethe A1 model paper' },
    ],
  },
]

export const setup: Item[] = [
  {
    id: 'setup.placement',
    label: 'Placement test',
    detail: 'Goethe\'s "Test your German" or DW\'s level test. Note the score.',
  },
  { id: 'setup.sounds', label: 'Go through Sounds once', detail: 'Use Speak on a few cards.' },
  {
    id: 'setup.first-cards',
    label: 'First 10 new cards in Today',
    auto: true,
  },
  { id: 'setup.nicos-1', label: 'Nicos Weg episode 1 and its exercises' },
  { id: 'setup.lessons', label: 'Look at the lesson list in Cards once' },
]

export interface Milestone {
  title: string
  check: string
  items: Item[]
}

export const milestones: Milestone[] = [
  {
    title: 'End of week 2',
    check: "Say it to the Speak button's voice and compare.",
    items: [
      { id: 'm-w2.read-aloud', label: 'Sound out any German word aloud' },
      {
        id: 'm-w2.intro',
        label: "Say who you are, where you're from and live, that you're learning German",
      },
      { id: 'm-w2.coffee', label: 'Order a coffee and say thanks' },
      { id: 'm-w2.count', label: 'Count to ten' },
    ],
  },
  {
    title: 'End of month 1',
    check: 'Journal sentences without a translator.',
    items: [
      { id: 'm-m1.present', label: 'Present tense with `sein`, `haben` and regular verbs' },
      { id: 'm-m1.articles', label: '`der/die/das` and `ein/kein` in nominative and accusative' },
      { id: 'm-m1.write', label: 'Write 3-4 sentences about your family or food' },
      { id: 'm-m1.follow', label: 'Follow Nicos Weg A1 with German subtitles' },
    ],
  },
  {
    title: 'End of month 3',
    check: 'Goethe A1 model paper at 60%+, placement test at A1 or better.',
    items: [
      { id: 'm-m3.nicos', label: 'Finished Nicos Weg A1, started A2' },
      { id: 'm-m3.grammar', label: 'Modals, separable verbs and a first Perfekt' },
      { id: 'm-m3.words', label: 'About 600 words known' },
      { id: 'm-m3.chat', label: 'Short chat about your day' },
    ],
  },
]
