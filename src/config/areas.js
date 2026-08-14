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

// Tailwind class names are written out in full on purpose — Tailwind only keeps
// classes it can literally see in the source, so "bg-" + color would break.
export const PALETTES = {
  amber: {
    solid: 'bg-amber-500',
    soft: 'bg-amber-50',
    softer: 'bg-amber-100',
    border: 'border-amber-200',
    text: 'text-amber-700',
    ring: 'focus-visible:outline-amber-500',
  },
  sky: {
    solid: 'bg-sky-500',
    soft: 'bg-sky-50',
    softer: 'bg-sky-100',
    border: 'border-sky-200',
    text: 'text-sky-700',
    ring: 'focus-visible:outline-sky-500',
  },
  cyan: {
    solid: 'bg-cyan-500',
    soft: 'bg-cyan-50',
    softer: 'bg-cyan-100',
    border: 'border-cyan-200',
    text: 'text-cyan-700',
    ring: 'focus-visible:outline-cyan-500',
  },
  teal: {
    solid: 'bg-teal-500',
    soft: 'bg-teal-50',
    softer: 'bg-teal-100',
    border: 'border-teal-200',
    text: 'text-teal-700',
    ring: 'focus-visible:outline-teal-500',
  },
  rose: {
    solid: 'bg-rose-500',
    soft: 'bg-rose-50',
    softer: 'bg-rose-100',
    border: 'border-rose-200',
    text: 'text-rose-700',
    ring: 'focus-visible:outline-rose-500',
  },
  violet: {
    solid: 'bg-violet-500',
    soft: 'bg-violet-50',
    softer: 'bg-violet-100',
    border: 'border-violet-200',
    text: 'text-violet-700',
    ring: 'focus-visible:outline-violet-500',
  },
  emerald: {
    solid: 'bg-emerald-500',
    soft: 'bg-emerald-50',
    softer: 'bg-emerald-100',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    ring: 'focus-visible:outline-emerald-500',
  },
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

export function paletteFor(area) {
  return PALETTES[area.color] ?? PALETTES.sky
}
