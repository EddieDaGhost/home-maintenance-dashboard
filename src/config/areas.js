// ============================================================================
// THIS IS THE FILE YOU EDIT to change your home, your rooms, or your chores.
// Everything else in the app reads from here.
// ============================================================================
//
// Each area needs:
//   id     - also the NFC tag URL: id "kitchen" -> yoursite.com/#kitchen
//   name   - shown on the card
//   icon   - any icon name from https://lucide.dev/icons
//   color  - a palette from PALETTES below
//   tasks  - the list of things to do in that area
//
// Each task needs a `schedule`. The available kinds:
//
//   { kind: 'daily' }                              every day
//   { kind: 'weekdays', days: [1, 3, 5] }          on these weekdays (0 = Sunday)
//   { kind: 'timesPerWeek', times: 2 }             any 2 days a week, your pick
//   { kind: 'weekly' }                             once a week, any day
//   { kind: 'weeklyOn', day: 5 }                   every Friday
//   { kind: 'weekend' }                            Saturday or Sunday
//   { kind: 'rotatingWeek', cycle: 3, offset: 0 }  your turn 1 week in every 3
//   { kind: 'everyNDays', days: 14, grace: 2 }     14 days after you last did it
//   { kind: 'everyNMonths', months: 3 }            quarterly
//
// `points` is how much a task is worth toward your weekly score. Bigger,
// harder jobs are worth more. Nothing bad happens if you skip one.

import { Bath, Cat, ChefHat, Egg, WashingMachine } from 'lucide-react'

// Each area's color, given once per theme. Components read these as CSS
// variables (see areaStyle below), so a theme can repaint every area without
// any component knowing about it.
//
//   base  - the solid accent: icon tile, progress fill
//   ink   - text tinted with the area color
//   tint  - the card background
//   line  - the card border
const rgba = (hex, alpha) => {
  const value = parseInt(hex.slice(1), 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

function makePalette({ base, ink, tint, line, spaceBase, spaceInk }) {
  return {
    home: { base, ink, tint, line, track: 'rgba(255, 255, 255, 0.75)', glow: 'transparent' },
    // In orbit the cards go dark and the color becomes a lit edge instead of a wash.
    starship: {
      base: spaceBase,
      ink: spaceInk,
      tint: rgba(spaceBase, 0.08),
      line: rgba(spaceBase, 0.32),
      track: 'rgba(148, 197, 255, 0.12)',
      glow: rgba(spaceBase, 0.4),
    },
  }
}

export const PALETTES = {
  amber: makePalette({ base: '#f59e0b', ink: '#b45309', tint: '#fffbeb', line: '#fde68a', spaceBase: '#fbbf24', spaceInk: '#fcd34d' }),
  sky: makePalette({ base: '#0ea5e9', ink: '#0369a1', tint: '#f0f9ff', line: '#bae6fd', spaceBase: '#38bdf8', spaceInk: '#7dd3fc' }),
  cyan: makePalette({ base: '#06b6d4', ink: '#0e7490', tint: '#ecfeff', line: '#a5f3fc', spaceBase: '#22d3ee', spaceInk: '#67e8f9' }),
  teal: makePalette({ base: '#14b8a6', ink: '#0f766e', tint: '#f0fdfa', line: '#99f6e4', spaceBase: '#2dd4bf', spaceInk: '#5eead4' }),
  rose: makePalette({ base: '#f43f5e', ink: '#be123c', tint: '#fff1f2', line: '#fecdd3', spaceBase: '#fb7185', spaceInk: '#fda4af' }),
  violet: makePalette({ base: '#8b5cf6', ink: '#6d28d9', tint: '#f5f3ff', line: '#ddd6fe', spaceBase: '#a78bfa', spaceInk: '#c4b5fd' }),
  emerald: makePalette({ base: '#10b981', ink: '#047857', tint: '#ecfdf5', line: '#a7f3d0', spaceBase: '#34d399', spaceInk: '#6ee7b7' }),
}

export const AREAS = [
  {
    id: 'litter',
    name: 'Litter Boxes',
    subtitle: '3 boxes · 4 cats',
    icon: Cat,
    color: 'amber',
    tasks: [
      {
        id: 'litter-scoop',
        name: 'Scoop all 3 boxes',
        schedule: { kind: 'weekdays', days: [1, 3, 5] },
        points: 3,
      },
      {
        id: 'litter-full-change',
        name: 'Full litter change',
        note: 'Dump, wash, refill. Saturdays work well.',
        schedule: { kind: 'everyNDays', days: 14, grace: 3, calendarDays: [6] },
        points: 10,
      },
    ],
  },
  {
    id: 'bathroom-1',
    name: 'Bathroom 1',
    subtitle: 'Deep clean week 1 of 3',
    icon: Bath,
    color: 'sky',
    tasks: [
      {
        id: 'bath1-deep-clean',
        name: 'Deep clean',
        note: 'Toilet, sink, tub, floor.',
        schedule: { kind: 'rotatingWeek', cycle: 3, offset: 0, day: 6 },
        points: 15,
      },
      { id: 'bath1-mirror', name: 'Wipe mirror', schedule: { kind: 'timesPerWeek', times: 2 }, points: 2 },
      { id: 'bath1-supplies', name: 'Check supplies', note: 'TP, soap, towels.', schedule: { kind: 'weekly' }, points: 2 },
    ],
  },
  {
    id: 'bathroom-2',
    name: 'Bathroom 2',
    subtitle: 'Deep clean week 2 of 3',
    icon: Bath,
    color: 'cyan',
    tasks: [
      {
        id: 'bath2-deep-clean',
        name: 'Deep clean',
        note: 'Toilet, sink, tub, floor.',
        schedule: { kind: 'rotatingWeek', cycle: 3, offset: 1, day: 6 },
        points: 15,
      },
      { id: 'bath2-mirror', name: 'Wipe mirror', schedule: { kind: 'timesPerWeek', times: 2 }, points: 2 },
      { id: 'bath2-trash', name: 'Empty trash', schedule: { kind: 'timesPerWeek', times: 2 }, points: 2 },
    ],
  },
  {
    id: 'bathroom-3',
    name: 'Bathroom 3',
    subtitle: 'Deep clean week 3 of 3',
    icon: Bath,
    color: 'teal',
    tasks: [
      {
        id: 'bath3-deep-clean',
        name: 'Deep clean',
        note: 'Toilet, sink, tub, floor.',
        schedule: { kind: 'rotatingWeek', cycle: 3, offset: 2, day: 6 },
        points: 15,
      },
      { id: 'bath3-mirror', name: 'Wipe mirror', schedule: { kind: 'timesPerWeek', times: 2 }, points: 2 },
      { id: 'bath3-supplies', name: 'Check supplies', note: 'TP, soap, towels.', schedule: { kind: 'weekly' }, points: 2 },
    ],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    subtitle: 'Dishes & fridge',
    icon: ChefHat,
    color: 'rose',
    tasks: [
      { id: 'kitchen-dishes', name: 'Dishes', note: 'Sink empty before bed.', schedule: { kind: 'daily' }, points: 4 },
      {
        id: 'kitchen-fridge',
        name: 'Fridge check & organize',
        note: 'Toss the science experiments, write the grocery list.',
        schedule: { kind: 'weeklyOn', day: 5 },
        points: 8,
      },
    ],
  },
  {
    id: 'laundry',
    name: 'Laundry',
    subtitle: 'Weekend reset',
    icon: WashingMachine,
    color: 'violet',
    tasks: [
      { id: 'laundry-wash', name: 'Wash & dry', schedule: { kind: 'weekend' }, points: 8 },
      { id: 'laundry-fold', name: 'Fold & put away', note: 'The real boss fight.', schedule: { kind: 'weekend' }, points: 8 },
    ],
  },
  {
    id: 'chickens',
    name: 'Chickens',
    subtitle: 'Coop & flock',
    icon: Egg,
    color: 'emerald',
    tasks: [
      { id: 'chickens-food-water', name: 'Food & water top-up', schedule: { kind: 'weekly' }, points: 5 },
      {
        id: 'chickens-checkin',
        name: 'Flock check-in',
        note: 'Health, eggs, behavior. Anything look off?',
        schedule: { kind: 'everyNDays', days: 3, grace: 1 },
        points: 5,
      },
      {
        id: 'chickens-deep-clean',
        name: 'Coop deep clean',
        note: 'Full bedding change and scrub.',
        schedule: { kind: 'everyNMonths', months: 3 },
        points: 25,
      },
    ],
  },
]

export const AREAS_BY_ID = Object.fromEntries(AREAS.map((area) => [area.id, area]))

export const ALL_TASKS = AREAS.flatMap((area) => area.tasks.map((task) => ({ ...task, area })))

export function paletteFor(area, themeId = 'home') {
  const palette = PALETTES[area.color] ?? PALETTES.sky
  return palette[themeId] ?? palette.home
}

/**
 * The area's colors as CSS variables to spread onto an element's `style`.
 * Overriding --surface and --line here is what makes a .panel tint itself in
 * the area's color, in whichever theme is active.
 */
export function areaStyle(area, themeId = 'home') {
  const palette = paletteFor(area, themeId)
  return {
    '--area': palette.base,
    '--area-ink': palette.ink,
    '--area-track': palette.track,
    '--area-glow': palette.glow,
    '--surface': palette.tint,
    '--line': palette.line,
  }
}
