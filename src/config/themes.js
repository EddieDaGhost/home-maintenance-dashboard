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

import { Cat, Home, Rocket } from 'lucide-react'

export const THEMES = {
  home: {
    id: 'home',
    name: 'Homestead',
    tagline: 'Soft daylight. Calm and plain.',
    icon: Home,
    /** 'space' turns on the starfield backdrop. */
    flavor: 'plain',
    /** Which scene the credits screen draws. See src/components/scenes/. */
    progression: { sceneKind: 'garden' },
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

      // --- the credits screen ---
      estateNav: 'Your windowsill',
      estateNavDetail: 'Spend credits on something nice',
      estateTitle: 'The windowsill',
      estateBlurb:
        'Everything you log earns credits. They buy decoration and nothing else — no chore is ever locked behind one.',
      estateLively: 'Full sun. Everything is showing off.',
      estateQuiet: 'Low evening light. Everything is resting.',
      shopTitle: 'The shop',
      shelfTitle: 'On the sill',
      companionPlaceholder: 'Name this one',
      creditsLabel: 'Credits',
      creditsUnit: 'cr',
    },
  },

  starship: {
    id: 'starship',
    name: 'Starship',
    tagline: 'Your house, in orbit. You have the conn.',
    icon: Rocket,
    flavor: 'space',
    progression: { sceneKind: 'ship' },
    copy: {
      appTitle: 'Home Base One',
      streakLabel: 'Days online',
      // "Credits" is the spendable currency on the estate screen, so the weekly
      // tally needs its own word — two meanings for one label is worse flavour
      // than either name on its own.
      pointsLabel: 'Output',
      todayLabel: 'Logged',
      pointsUnit: 'pts',
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

      estateNav: 'Your ship',
      estateNavDetail: 'Spend credits on the hull',
      estateTitle: 'The ship',
      estateBlurb:
        'Every log earns credits. They buy paint and fittings and nothing else — no system is ever locked behind one.',
      estateLively: 'All lit up and under way.',
      estateQuiet: 'Running dark on standby.',
      shopTitle: 'Requisitions',
      shelfTitle: 'The crew',
      companionPlaceholder: 'Crew name',
      creditsLabel: 'Credits',
      creditsUnit: 'cr',
    },
  },

  cats: {
    id: 'cats',
    name: 'Cats',
    tagline: 'A warm afternoon and four opinions.',
    icon: Cat,
    flavor: 'plain',
    progression: { sceneKind: 'cats' },
    copy: {
      appTitle: 'The Cat House',
      streakLabel: 'Day streak',
      pointsLabel: 'Points',
      todayLabel: 'Today',
      pointsUnit: 'pts',
      weekTitle: 'This week',
      weekNote: 'Every log counts. Nobody here is keeping score but you.',
      queueTitle: 'Wants doing',
      areasTitle: 'Rooms',
      allClearTitle: 'Nothing is due right now',
      allClearBody: 'The house is handled. Go and sit down.',
      exportLabel: 'Export to iPhone Calendar',
      nfcHint: 'Tap a tag to jump straight to its room.',
      backLabel: 'All rooms',
      todoTitle: 'To do',
      restTitle: 'Everything else',
      allTasksTitle: 'All tasks',
      recentTitle: 'Recently done',
      areaClear: 'Nothing due here right now.',
      allClearBadge: 'All clear',
      toDoBadge: (n) => `${n} to do`,
      logButton: 'Log',
      cheers: ['Good', 'Noted', 'That counts', 'Logged', 'Well done you'],
      undone: 'Undone',
      exported: 'Calendar file downloaded',
      themeButtonLabel: 'Change look',

      estateNav: 'Your cats',
      estateNavDetail: 'Spend credits on the cats',
      estateTitle: 'The cats',
      estateBlurb:
        'Everything you log earns credits. They buy cats and things for cats and nothing else — no chore is ever locked behind one.',
      estateLively: 'Wide awake and causing problems.',
      estateQuiet: 'Everyone is asleep in the warm patch.',
      shopTitle: 'The shop',
      shelfTitle: 'The household',
      companionPlaceholder: 'Name this cat',
      creditsLabel: 'Credits',
      creditsUnit: 'cr',
    },
  },
}

export const THEME_LIST = Object.values(THEMES)
export const DEFAULT_THEME_ID = 'home'
