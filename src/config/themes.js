// ============================================================================
// THEMES — the looks you can switch between from the dashboard.
// ============================================================================
//
// A theme is two things:
//   1. A block of color variables in src/index.css (keyed by data-theme)
//   2. An entry here: its name, its icon, and the words it uses
//
// The `copy` object lets a theme rename anything on screen. Nothing about how
// tasks work changes — a schedule is a schedule regardless of the paint.
//
// To add a third theme: add a `[data-theme='yourid']` block to index.css, add
// an entry here with the same id, and add a matching palette variant to each
// palette in src/config/areas.js.

import { Home, Rocket } from 'lucide-react'

export const THEMES = {
  home: {
    id: 'home',
    name: 'Homestead',
    tagline: 'Soft daylight. Calm and plain.',
    icon: Home,
    /** 'space' turns on the starfield backdrop. */
    flavor: 'plain',
    copy: {
      appTitle: 'Home Maintenance',
      streakLabel: 'Day streak',
      pointsLabel: 'Points',
      todayLabel: 'Today',
      pointsUnit: 'pts',
      weekTitle: 'This week',
      weekNote: 'Every log counts. Partial weeks are still good weeks.',
      queueTitle: 'Right now',
      areasTitle: 'Areas',
      allClearTitle: 'Nothing is due right now',
      allClearBody: 'The house is handled. Go do something else.',
      exportLabel: 'Export to iPhone Calendar',
      nfcHint: 'Tap an NFC tag to jump straight to its area.',
      backLabel: 'All areas',
      todoTitle: 'To do',
      restTitle: 'Everything else',
      allTasksTitle: 'All tasks',
      recentTitle: 'Recent activity',
      areaClear: 'Nothing due here right now.',
      allClearBadge: 'All clear',
      toDoBadge: (n) => `${n} to do`,
      logButton: 'Log',
      cheers: ['Nice one', 'Done and dusted', 'That counts', 'Logged', 'Off the list'],
      undone: 'Undone',
      exported: 'Calendar file downloaded',
      themeButtonLabel: 'Change look',
    },
  },

  starship: {
    id: 'starship',
    name: 'Starship',
    tagline: 'Your house, in orbit. You have the conn.',
    icon: Rocket,
    flavor: 'space',
    copy: {
      appTitle: 'Home Base One',
      streakLabel: 'Days online',
      pointsLabel: 'Credits',
      todayLabel: 'Logged',
      pointsUnit: 'cr',
      weekTitle: 'Weekly mission',
      weekNote: 'Every log counts. A partial cycle is still a good cycle.',
      queueTitle: 'Priority queue',
      areasTitle: 'Decks',
      allClearTitle: 'All systems nominal',
      allClearBody: 'The station is holding steady. Go do something else.',
      exportLabel: 'Sync mission log to Calendar',
      nfcHint: 'Tap a docking point to jump straight to that deck.',
      backLabel: 'All decks',
      todoTitle: 'Action queue',
      restTitle: 'Standby',
      allTasksTitle: 'All systems',
      recentTitle: "Ship's log",
      areaClear: 'This deck is clear.',
      allClearBadge: 'Nominal',
      toDoBadge: (n) => (n === 1 ? '1 task' : `${n} tasks`),
      logButton: 'Log',
      cheers: ['Logged to the record', 'Deck secured', 'Systems green', 'Task complete', 'Noted, Captain'],
      undone: 'Entry retracted',
      exported: 'Mission log exported',
      themeButtonLabel: 'Change look',
    },
  },
}

export const THEME_LIST = Object.values(THEMES)
export const DEFAULT_THEME_ID = 'home'
