// Pure logic: schedules, statuses, streaks, points and the .ics builder.
// No browser needed — this is the fast suite, and the one to run while editing
// anything in src/lib.

import { AREAS } from '../src/config/areas.js'
import { getTaskState, STATUS, scheduleLabel } from '../src/lib/schedule.js'
import {
  currentStreak,
  weeklyPoints,
  weeklyPointsGoal,
  progressFor,
  tasksNeedingAttention,
} from '../src/lib/stats.js'
import { buildCalendar } from '../src/lib/calendar.js'
import { weekIndex } from '../src/lib/date.js'
import {
  ALL_SLOTS,
  CATALOG,
  CATALOG_BY_SLOT,
  COMPANION_COST,
  MAX_COMPANIONS,
  TREAT_COST,
  TREAT_HOURS,
  itemById,
} from '../src/config/catalog.js'
import { MOOD, creditsBalance, creditsEarned, owns, sceneMood } from '../src/lib/credits.js'
import {
  LOOKS,
  buyCompanion,
  buyItem,
  buyTreat,
  entryFor,
  equip,
  lookFor,
  normalizeEstate,
  renameCompanion,
} from '../src/lib/estate.js'
import { buildBackup, parseBackup } from '../src/lib/backup.js'
import { MAPS_NAMES, buildMapsLink, otherMaps, preferredMaps } from '../src/lib/maps.js'
import {
  UNITS,
  clearHome,
  clearWork,
  defaultUnits,
  emptyPlaces,
  hasPlaces,
  normalizePlaces,
  setHome,
  setUnits,
  setWork,
} from '../src/lib/places.js'
import {
  MAX_TEXT,
  addItem,
  doneItems,
  emptyDaily,
  normalizeDaily,
  openItems,
  pruneDaily,
  removeItem,
  toggleItem,
} from '../src/lib/daily.js'
import {
  ALL_CODES,
  STALE_MS,
  cacheKey,
  describeCode,
  formatTemp,
  isStale,
  placeLabel,
  readingFrom,
  unitSymbol,
} from '../src/lib/forecast.js'
import {
  addWindow,
  awayUntilLabel,
  clearFreshStart,
  endWindowNow,
  hasFreshStart,
  inGrace,
  isAway,
  normalizeAway,
  removeWindow,
  startFresh,
  upcomingWindows,
} from '../src/lib/away.js'
import {
  emptyCustom,
  normalizeCustom,
  resetTaskSettings,
  updateTaskSettings,
} from '../src/lib/custom.js'
import { composeAreas } from '../src/lib/compose.js'
import { hardReset, resetSummary } from '../src/lib/reset.js'
import { mergeCompletions } from '../src/lib/sync.js'
import { ROTATE, isTurnOf, lastLoggedBy, mineOf, turnLabel, whoseTurn } from '../src/lib/turns.js'
import { THEME_LIST } from '../src/config/themes.js'

const ALL_TASKS = AREAS.flatMap((area) => area.tasks.map((task) => ({ ...task, area })))

export default async function run({ check }) {
  // `check` here compares a value to an expectation, so wrap it to keep the
  // assertions below reading the way they did when they were written.
  const is = (name, actual, expected) =>
    check(name, actual === expected, actual === expected ? '' : `got ${actual}, expected ${expected}`)

  const task = (id) => ALL_TASKS.find((t) => t.id === id)
  const D = (s) => new Date(s)
  const st = (id, completions, now) => getTaskState(task(id), completions, now)

  // 2026-08-17 is a Monday.
  const MON = D('2026-08-17T09:00:00')
  const TUE = D('2026-08-18T09:00:00')
  const WED = D('2026-08-19T09:00:00')
  const FRI = D('2026-08-21T09:00:00')
  const SAT = D('2026-08-22T09:00:00')
  const SUN = D('2026-08-23T09:00:00')

  is('Monday, nothing logged', st('litter-scoop', [], MON).status, STATUS.DUE)
  is('Monday, logged today', st('litter-scoop', [D('2026-08-17T08:00:00').getTime()], MON).status, STATUS.DONE)
  is('Tuesday is a rest day', st('litter-scoop', [], TUE).status, STATUS.RESTING)
  is('Tuesday says next up', st('litter-scoop', [], TUE).detail, 'Next: Wednesday')
  is('Wednesday, Monday log does not carry over', st('litter-scoop', [D('2026-08-17T08:00:00').getTime()], WED).status, STATUS.DUE)
  is('label', scheduleLabel(task('litter-scoop').schedule), 'Mon · Wed · Fri')

  is('none yet', st('bath1-mirror', [], WED).detail, '0 of 2 done')
  is('one done', st('bath1-mirror', [MON.getTime()], WED).status, STATUS.DUE)
  is('one done detail', st('bath1-mirror', [MON.getTime()], WED).detail, '1 of 2 done')
  is('two done', st('bath1-mirror', [MON.getTime(), WED.getTime()], WED).status, STATUS.DONE)
  is('last week does not count', st('bath1-mirror', [D('2026-08-12T09:00:00').getTime()], WED).detail, '0 of 2 done')
  is('sunday with none left is overdue', st('bath1-mirror', [], SUN).status, STATUS.OVERDUE)

  is('Wednesday resting', st('kitchen-fridge', [], WED).status, STATUS.RESTING)
  is('Wednesday label', st('kitchen-fridge', [], WED).detail, 'Next: Friday')
  is('Friday due', st('kitchen-fridge', [], FRI).status, STATUS.DUE)
  is('Saturday catch-up still due', st('kitchen-fridge', [], SAT).status, STATUS.DUE)
  is('Friday logged', st('kitchen-fridge', [FRI.getTime()], SAT).status, STATUS.DONE)

  is('Wednesday resting', st('laundry-wash', [], WED).status, STATUS.RESTING)
  is('Saturday due', st('laundry-wash', [], SAT).status, STATUS.DUE)
  is('Sunday, still not done', st('laundry-wash', [], SUN).status, STATUS.OVERDUE)
  is('Saturday done, Sunday shows done', st('laundry-wash', [SAT.getTime()], SUN).status, STATUS.DONE)

  for (let w = 0; w < 3; w++) {
    const day = D('2026-08-17T09:00:00')
    day.setDate(day.getDate() + w * 7)
    const active = ['bath1-deep-clean', 'bath2-deep-clean', 'bath3-deep-clean'].filter(
      (id) => st(id, [], day).status !== STATUS.RESTING,
    )
    is(`week starting ${day.toDateString()} has exactly one bathroom active`, active.length, 1)
  }

  const daysAgo = (n, from = MON) => new Date(from.getTime() - n * 86400000).getTime()
  is('litter change 13 days ago', st('litter-full-change', [daysAgo(13)], MON).status, STATUS.UPCOMING)
  is('litter change 13 days ago detail', st('litter-full-change', [daysAgo(13)], MON).detail, 'Due tomorrow')
  is('litter change 14 days ago', st('litter-full-change', [daysAgo(14)], MON).status, STATUS.DUE)
  is('litter change 18 days ago', st('litter-full-change', [daysAgo(18)], MON).status, STATUS.OVERDUE)
  is('litter change today', st('litter-full-change', [MON.getTime()], MON).status, STATUS.DONE)
  is('never logged', st('litter-full-change', [], MON).status, STATUS.DUE)
  is('flock check-in 3 days ago', st('chickens-checkin', [daysAgo(3)], MON).status, STATUS.DUE)
  is('flock check-in 2 days ago', st('chickens-checkin', [daysAgo(2)], MON).status, STATUS.UPCOMING)
  is('flock check-in 5 days ago', st('chickens-checkin', [daysAgo(5)], MON).status, STATUS.OVERDUE)
  is('coop clean 100 days ago', st('chickens-deep-clean', [daysAgo(100)], MON).status, STATUS.DUE)

  const log = { completions: {} }
  is('empty streak', currentStreak(log, MON), 0)
  is('empty week points', weeklyPoints(log, MON, ALL_TASKS), 0)
  is('area with open work is below 100%', progressFor(AREAS[0].tasks, log, MON).percent, 0)
  const litterDone = { completions: { 'litter-scoop': [MON.getTime()], 'litter-full-change': [MON.getTime()] } }
  is('area fully logged is 100%', progressFor(AREAS[0].tasks, litterDone, MON).percent, 100)
  is('resting-only area reads 100%', progressFor(AREAS[5].tasks, log, WED).percent, 100)

  const streakLog = {
    completions: {
      'kitchen-dishes': [daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(4)],
    },
  }
  is('3-day streak (gap at day 3)', currentStreak(streakLog, MON), 3)
  is('streak survives logging only yesterday', currentStreak({ completions: { 'kitchen-dishes': [daysAgo(1)] } }, MON), 1)
  is('stale streak resets', currentStreak({ completions: { 'kitchen-dishes': [daysAgo(3)] } }, MON), 0)
  is('points: 1 dish log this week = 4', weeklyPoints({ completions: { 'kitchen-dishes': [MON.getTime()] } }, MON, ALL_TASKS), 4)
  is('last week points excluded', weeklyPoints({ completions: { 'kitchen-dishes': [daysAgo(7)] } }, MON, ALL_TASKS), 0)
  for (const { task: t, state } of tasksNeedingAttention({ completions: {} }, MON, ALL_TASKS)) {
  }

  const ics = buildCalendar({ completions: {} }, MON, {}, AREAS).ics
  is('CRLF line endings', ics.includes('\r\n'), true)
  is('starts correctly', ics.startsWith('BEGIN:VCALENDAR'), true)
  is('ends correctly', ics.trim().endsWith('END:VCALENDAR'), true)
  is('event count matches task count', (ics.match(/BEGIN:VEVENT/g) || []).length, ALL_TASKS.length)
  is('every event closed', (ics.match(/END:VEVENT/g) || []).length, ALL_TASKS.length)
  is('no alarms', ics.includes('VALARM'), false)
  is('no over-long lines', ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75), true)
  is('no empty lines', ics.split('\r\n').some((l) => l.trim() === ''), false)

  // =========================================================================
  // Credits, the shop and the estate
  // =========================================================================

  // --- the catalogue holds together ---
  const ids = CATALOG.map((i) => i.id)
  is('catalogue ids are unique', new Set(ids).size, ids.length)
  is('every item costs something', CATALOG.every((i) => i.cost > 0), true)
  is('every item has art', CATALOG.every((i) => typeof i.art === 'string' && i.art), true)
  // The check that stops a half-added item: a missing label would render a blank
  // row in one theme and nowhere else, which is exactly the bug nobody notices.
  is(
    'every item is named in all three looks',
    CATALOG.every((i) => ['home', 'starship', 'cats'].every((t) => i.labels?.[t]?.name)),
    true,
  )
  // Every `art` key has to be handled by all three scene components. There is no
  // way to import a .jsx scene from here, so this list is the guard: adding an
  // item with new art fails this check, which is the reminder to go and draw it
  // in Windowsill, Ship and Cats rather than shipping an item that draws nothing.
  const DRAWN = [
    'succulent', 'fern', 'monstera', 'orchid',
    'terracotta', 'sage', 'cobalt', 'blush', 'copper',
    'herbs', 'curtain',
    'rain', 'snow', 'glow',
    'suncatcher', 'bunting', 'chimes', 'lantern',
  ]
  is('every item has art the scenes can draw', CATALOG.every((i) => DRAWN.includes(i.art)), true)
  is('and nothing in that list is unused', DRAWN.every((art) => CATALOG.some((i) => i.art === art)), true)

  is('itemById finds one', itemById('vessel-fern')?.slot, 'vessel')
  is('every slot has something in it', ALL_SLOTS.every((slot) => CATALOG_BY_SLOT[slot].length > 1), true)
  is(
    'each slot lists cheapest first',
    ALL_SLOTS.every((slot) => CATALOG_BY_SLOT[slot].every((item, i, list) => i === 0 || list[i - 1].cost <= item.cost)),
    true,
  )
  is('every item sits in a real slot', CATALOG.every((i) => ALL_SLOTS.includes(i.slot)), true)
  is('itemById shrugs at nonsense', itemById('nope'), null)
  is(
    'every look has the estate copy it needs',
    THEME_LIST.every((t) => t.copy.estateTitle && t.copy.shopTitle && t.copy.creditsUnit),
    true,
  )
  // A half-added string shows up as a blank space in one look and nowhere else,
  // which is exactly the kind of thing nobody notices until a screenshot.
  is(
    'every look says all the same things',
    (() => {
      const keys = THEME_LIST.map((t) => Object.keys(t.copy).sort().join('|'))
      return new Set(keys).size
    })(),
    1,
  )
  is(
    'every look names a scene that exists',
    THEME_LIST.every((t) => ['garden', 'ship', 'cats'].includes(t.progression?.sceneKind)),
    true,
  )
  is('the catalogue names every look', new Set(CATALOG.flatMap((i) => Object.keys(i.labels))).size, THEME_LIST.length)

  // --- earning ---
  const ROSTER = [{ id: 'eddie', name: 'Eddie' }, { id: 'yas', name: 'Yasmine' }]
  const shared = {
    completions: {
      'kitchen-dishes': [
        { at: daysAgo(1), by: 'eddie' },
        { at: daysAgo(2), by: 'yas' },
        daysAgo(3), // logged before the household feature existed
      ],
    },
  }
  is('a person earns only their own logs', creditsEarned(shared, ALL_TASKS, 'yas', ROSTER), 4)
  is('unattributed history goes to the first person', creditsEarned(shared, ALL_TASKS, 'eddie', ROSTER), 8)
  is('nobody earns for nobody', creditsEarned(shared, ALL_TASKS, null, ROSTER), 0)

  // --- spending ---
  // One wallet, three scenes: what you own is per look, but the credits come
  // out of the same pot however you spend them.
  const HOME = 'home'
  const SHIP = 'starship'
  const fern = itemById('vessel-fern')
  const shelf = (e, look = HOME) => lookFor(entryFor(e, 'eddie'), look)

  let estate = {}
  estate = buyItem(estate, 'eddie', HOME, fern, 40)
  is('a purchase you cannot afford is refused', Object.keys(estate).length, 0)

  estate = buyItem(estate, 'eddie', HOME, fern, 200)
  is('buying records the spend', entryFor(estate, 'eddie').spent, fern.cost)
  is('buying wears it straight away', shelf(estate).equipped.vessel, 'vessel-fern')
  is('and it is owned', owns(shelf(estate), 'vessel-fern'), true)

  // The thing this whole shape exists for: a ship is not a cat.
  is('but not in another look', owns(shelf(estate, SHIP), 'vessel-fern'), false)
  is('and nothing is worn there', shelf(estate, SHIP).equipped.vessel, undefined)
  is('a look nobody has touched is simply empty', shelf(estate, 'cats').owned.length, 0)

  estate = buyItem(estate, 'eddie', HOME, fern, 200)
  is('buying the same thing twice charges once', entryFor(estate, 'eddie').spent, fern.cost)

  // Buying the same item in another look is a second purchase, at full price —
  // that is what makes choosing which scene to dress mean something.
  let both = buyItem(estate, 'eddie', SHIP, fern, 200)
  is('the same item in another look is bought again', owns(lookFor(entryFor(both, 'eddie'), SHIP), 'vessel-fern'), true)
  is('and charged again, from the one pot', entryFor(both, 'eddie').spent, fern.cost * 2)

  estate = equip(estate, 'eddie', HOME, 'vessel-fern')
  is('equipping what is worn takes it off', shelf(estate).equipped.vessel, undefined)
  estate = equip(estate, 'eddie', HOME, 'vessel-monstera')
  is('you cannot wear what you do not own', shelf(estate).equipped.vessel, undefined)
  estate = equip(estate, 'eddie', SHIP, 'vessel-fern')
  is('nor wear it in a look you did not buy it in', lookFor(entryFor(estate, 'eddie'), SHIP).equipped.vessel, undefined)

  is("one person's spending is their own", entryFor(estate, 'yas').spent, 0)

  const bigLog = { completions: { 'kitchen-dishes': Array.from({ length: 30 }, (_, i) => ({ at: daysAgo(i), by: 'eddie' })) } }
  is('balance is earned minus spent', creditsBalance(bigLog, ALL_TASKS, 'eddie', ROSTER, entryFor(estate, 'eddie')), 120 - fern.cost)
  // 120 earned, 160 spent across two looks: one pot, and it is empty. Dressing
  // the ship really is money not spent on the windowsill.
  is(
    'and spending in one look comes off the balance in all of them',
    creditsBalance(bigLog, ALL_TASKS, 'eddie', ROSTER, entryFor(both, 'eddie')),
    0,
  )
  is(
    'the second look is not a second allowance',
    creditsBalance(bigLog, ALL_TASKS, 'eddie', ROSTER, entryFor(both, 'eddie')) <
      creditsBalance(bigLog, ALL_TASKS, 'eddie', ROSTER, entryFor(estate, 'eddie')),
    true,
  )
  is(
    'balance never goes negative',
    creditsBalance({ completions: {} }, ALL_TASKS, 'eddie', ROSTER, { spent: 9999 }),
    0,
  )

  // --- companions and the consumable ---
  let many = {}
  for (let i = 0; i < MAX_COMPANIONS + 2; i += 1) many = buyCompanion(many, 'eddie', HOME, COMPANION_COST, 99999)
  is('companions stop at the cap', shelf(many).companions.length, MAX_COMPANIONS)
  is('companions start unnamed', shelf(many).companions[0].name, '')
  is('and belong to the look they were bought in', shelf(many, SHIP).companions.length, 0)
  const named = renameCompanion(many, 'eddie', HOME, shelf(many).companions[0].id, '  Bruce  ')
  is('and can be named', shelf(named).companions[0].name, 'Bruce')
  is('naming one leaves the others alone', shelf(named).companions[1].name, '')
  is('a name survives being read back', normalizeEstate(named).eddie.looks[HOME].companions[0].name, 'Bruce')
  is('and only the ones bought were charged', entryFor(many, 'eddie').spent, MAX_COMPANIONS * COMPANION_COST)

  const T0 = MON.getTime()
  let treated = buyTreat({}, 'eddie', TREAT_COST, 10, T0)
  is('a treat you cannot afford is refused', Object.keys(treated).length, 0)
  treated = buyTreat({}, 'eddie', TREAT_COST, 500, T0)
  is('a treat lasts its full run', entryFor(treated, 'eddie').boostUntil, T0 + TREAT_HOURS * 3600000)
  treated = buyTreat(treated, 'eddie', TREAT_COST, 500, T0)
  is('buying again extends rather than replaces', entryFor(treated, 'eddie').boostUntil, T0 + 2 * TREAT_HOURS * 3600000)
  // A treat is a mood, not a possession — it lights up whichever scene you open.
  is('and it is not tied to one look', entryFor(treated, 'eddie').boostUntil > 0, true)

  // --- how the scene feels ---
  const behind = { completions: { 'chickens-checkin': [daysAgo(5)] } }
  is('an overdue task makes the scene quiet', sceneMood(behind, MON, ALL_TASKS), MOOD.QUIET)
  is(
    'logging it brings the scene back',
    sceneMood({ completions: { 'chickens-checkin': [daysAgo(0)] } }, MON, ALL_TASKS),
    MOOD.LIVELY,
  )
  is('nothing due at all is lively', sceneMood({ completions: {} }, MON, []), MOOD.LIVELY)
  is(
    'a treat holds the scene lively regardless',
    sceneMood(behind, MON, ALL_TASKS, entryFor(treated, 'eddie')),
    MOOD.LIVELY,
  )

  // --- reading a stored estate back ---
  is('rubbish normalises to nothing', Object.keys(normalizeEstate('nope')).length, 0)
  is('an empty person is dropped', Object.keys(normalizeEstate({ eddie: {} })).length, 0)
  const salvaged = normalizeEstate({
    eddie: {
      looks: {
        home: { owned: ['vessel-fern', 'not-a-thing'], equipped: { vessel: 'vessel-orchid', flair: 'vessel-fern' } },
      },
      spent: 80,
    },
  })
  is('an unknown purchase is kept, not dropped', salvaged.eddie.looks.home.owned.length, 2)
  is('but something unowned is never worn', salvaged.eddie.looks.home.equipped.vessel, undefined)
  is('and nothing is worn in the wrong slot', salvaged.eddie.looks.home.equipped.flair, undefined)

  // --- the migration: nothing anybody owns is ever taken away ---
  // Purchases made before ownership was per look become theirs in every look.
  // Design rule 2 — you can lose credits you spent, never a thing you own.
  const legacy = normalizeEstate({
    eddie: {
      owned: ['vessel-fern', 'finish-brass'],
      equipped: { vessel: 'vessel-fern' },
      companions: [{ id: 'c1', name: 'Bruce' }],
      spent: 210,
      boostUntil: 0,
    },
  })
  is('an old estate keeps its spend', legacy.eddie.spent, 210)
  is('and lands in every look', LOOKS.every((id) => legacy.eddie.looks[id]?.owned.length === 2), true)
  is('wearing what it was wearing', LOOKS.every((id) => legacy.eddie.looks[id].equipped.vessel === 'vessel-fern'), true)
  is('with its companions intact', legacy.eddie.looks.starship.companions[0].name, 'Bruce')
  is('the catalogue covers every look it was granted in', LOOKS.length, THEME_LIST.length)
  // Once migrated it is the new shape, so a second read changes nothing.
  is('and re-reading it is a no-op', JSON.stringify(normalizeEstate(legacy)), JSON.stringify(legacy))
  is(
    'an old estate that bought nothing stays nothing',
    Object.keys(normalizeEstate({ eddie: { owned: [], equipped: {}, companions: [] } })).length,
    0,
  )

  // --- backups carry it ---
  const restored = parseBackup(JSON.stringify(buildBackup(shared, {}, null, null, estate)))
  is('a backup restores the estate', restored.estate.eddie.spent, fern.cost)
  const old = parseBackup(JSON.stringify({ app: 'home-maintenance-dashboard', version: 2, completions: {} }))
  is('a backup from before the shop still reads', Object.keys(old.estate).length, 0)
  is('and has no trips in it', old.away.windows.length, 0)

  // =========================================================================
  // Being away
  // =========================================================================

  const day = (n, from = MON) => new Date(from.getTime() - n * 86400000)
  // Away for the four days ending yesterday: home again this morning.
  const justBack = addWindow({}, day(4).getTime(), day(1).getTime())
  // Away right now, through tomorrow.
  const onHoliday = addWindow({}, day(2).getTime(), day(-1).getTime())

  is('a stored trip reads back', justBack.windows.length, 1)
  is('away is away', isAway(onHoliday, MON), true)
  is('and home is home', isAway(justBack, MON), false)
  is('the day after counts as grace', inGrace(justBack, MON), true)
  is('two days after does not', inGrace(addWindow({}, day(6).getTime(), day(2).getTime()), MON), false)
  const backwards = addWindow({}, day(1).getTime(), day(5).getTime()).windows[0]
  is('a window written backwards is put right', backwards.from < backwards.to, true)
  is('and is stored at day resolution', new Date(backwards.from).getHours(), 0)

  // --- nothing is due while you're away, whatever the schedule kind ---
  const away2 = (id, completions, now = MON) => getTaskState(task(id), completions, now, onHoliday)
  is('a daily task rests while away', away2('kitchen-dishes', []).status, STATUS.RESTING)
  is('a weekday task rests while away', away2('litter-scoop', []).status, STATUS.RESTING)
  is('an interval task rests while away', away2('litter-full-change', [daysAgo(18)]).status, STATUS.RESTING)
  // A fortnight away, so the window actually covers the Sunday being asked about.
  const fortnight = addWindow({}, day(2).getTime(), day(-7).getTime())
  is('a weekend task rests while away', getTaskState(task('laundry-wash'), [], SUN, fortnight).status, STATUS.RESTING)
  is('and says so plainly', away2('kitchen-dishes', []).detail, 'Away')
  is('but done stays done', away2('kitchen-dishes', [MON.getTime()]).status, STATUS.DONE)
  is('nothing is on the plate while away', tasksNeedingAttention({ completions: {} }, MON, ALL_TASKS, onHoliday).length, 0)
  is('an area reads 100% while away', progressFor(AREAS[0].tasks, { completions: {} }, MON, onHoliday).percent, 100)

  // --- the day you get back is a list, not a reckoning ---
  is('overdue softens to due the day you are back', getTaskState(task('litter-full-change'), [daysAgo(18)], MON, justBack).status, STATUS.DUE)
  is(
    'and is honest again once the grace is over',
    getTaskState(task('litter-full-change'), [daysAgo(18)], MON, addWindow({}, day(9).getTime(), day(5).getTime())).status,
    STATUS.OVERDUE,
  )
  is('with no away store, nothing changes', st('litter-full-change', [daysAgo(18)], MON).status, STATUS.OVERDUE)

  // --- the streak carries over the gap ---
  const beforeTrip = {
    completions: { 'kitchen-dishes': [daysAgo(5), daysAgo(6), daysAgo(7), daysAgo(8)] },
  }
  is('without a trip that streak is stale', currentStreak(beforeTrip, MON), 0)
  is('the trip carries it over', currentStreak(beforeTrip, MON, null, justBack), 4)
  is('away days do not add to it', currentStreak(beforeTrip, MON, null, justBack) < 8, true)
  is(
    'logging from the road still counts',
    currentStreak({ completions: { 'kitchen-dishes': [daysAgo(0), daysAgo(3), daysAgo(5)] } }, MON, null, onHoliday),
    2,
  )
  is('a trip cannot resurrect an ancient streak', currentStreak({ completions: { 'kitchen-dishes': [daysAgo(40)] } }, MON, null, justBack), 0)

  // --- the scene stays lively ---
  is('an overdue task normally quiets the scene', sceneMood({ completions: { 'chickens-checkin': [daysAgo(5)] } }, MON, ALL_TASKS), MOOD.QUIET)
  is(
    'but not while away',
    sceneMood({ completions: { 'chickens-checkin': [daysAgo(5)] } }, MON, ALL_TASKS, null, onHoliday),
    MOOD.LIVELY,
  )

  // --- coming home early, and tidying up ---
  const endedEarly = endWindowNow(onHoliday, MON)
  is('coming back early ends the trip', isAway(endedEarly, MON), false)
  is('but keeps the days you were gone', endedEarly.windows.length, 1)
  is('a trip cancelled on its first day is dropped', endWindowNow(addWindow({}, MON.getTime(), day(-3).getTime()), MON).windows.length, 0)
  is('a trip can be removed outright', removeWindow(justBack, justBack.windows[0].from).windows.length, 0)
  is('upcoming lists what has not finished', upcomingWindows(onHoliday, MON).length, 1)
  is('and not what has', upcomingWindows(justBack, MON).length, 0)

  // --- reading a stored away back ---
  is('rubbish normalises to no trips', normalizeAway('nope').windows.length, 0)
  is('so does a broken window', normalizeAway({ windows: [{ from: 'x' }, null, 7] }).windows.length, 0)
  is('a corrupt store is never away', isAway(normalizeAway(undefined), MON), false)
  is('the label names the day', typeof awayUntilLabel(onHoliday, MON), 'string')
  is('and there is no label when home', awayUntilLabel(justBack, MON), null)

  const withTrip = parseBackup(JSON.stringify(buildBackup(shared, {}, null, null, estate, justBack)))
  is('a backup carries the trips', withTrip.away.windows.length, 1)

  // =========================================================================
  // Editing a task after the fact
  // =========================================================================

  const taskIn = (custom, taskId) =>
    composeAreas(custom)
      .flatMap((a) => a.tasks)
      .find((t) => t.id === taskId)

  is('a task starts with what it shipped with', taskIn(emptyCustom, 'kitchen-dishes').points, 4)

  let edited = updateTaskSettings(emptyCustom, 'kitchen-dishes', { points: 9 })
  is('points can be changed', taskIn(edited, 'kitchen-dishes').points, 9)
  is('and the id never moves', taskIn(edited, 'kitchen-dishes').id, 'kitchen-dishes')
  is('so the history still counts', weeklyPoints({ completions: { 'kitchen-dishes': [MON.getTime()] } }, MON, [taskIn(edited, 'kitchen-dishes')]), 9)

  edited = updateTaskSettings(edited, 'kitchen-dishes', { schedule: { kind: 'weekly' } })
  is('the schedule can be changed', taskIn(edited, 'kitchen-dishes').schedule.kind, 'weekly')
  is('and the new schedule is what gets used', getTaskState(taskIn(edited, 'kitchen-dishes'), [], TUE).status, STATUS.DUE)

  edited = updateTaskSettings(edited, 'kitchen-dishes', { repeatable: true })
  is('repeat can be turned on', taskIn(edited, 'kitchen-dishes').repeatable, true)
  is('but it does not change the status machine', getTaskState(taskIn(edited, 'kitchen-dishes'), [MON.getTime()], MON).status, STATUS.DONE)

  // Logging the same thing twice in a day is already worth twice as much —
  // the only thing repeat changes is whether the button is still there.
  const twice = { completions: { 'kitchen-dishes': [MON.getTime(), MON.getTime() - 3600000] } }
  is('two logs in a day pay twice', weeklyPoints(twice, MON, ALL_TASKS), 8)
  is('and are worth twice the credits', creditsEarned(twice, ALL_TASKS, 'me', [{ id: 'me' }]), 8)

  is('resetting puts the original back', taskIn(resetTaskSettings(edited, 'kitchen-dishes'), 'kitchen-dishes').points, 4)
  is('and leaves nothing behind', Object.keys(resetTaskSettings(edited, 'kitchen-dishes').taskSettings).length, 0)

  // A task you invented is edited through exactly the same map.
  const mine = updateTaskSettings(
    addTaskFixture(),
    'kitchen-my-thing',
    { points: 12 },
  )
  is('a custom task edits the same way', taskIn(mine, 'kitchen-my-thing').points, 12)

  is('rubbish settings normalise away', Object.keys(normalizeCustom({ taskSettings: { x: { points: 'lots' } } }).taskSettings).length, 0)
  is('and so do out-of-range points', Object.keys(normalizeCustom({ taskSettings: { x: { points: 1000 } } }).taskSettings).length, 0)
  is('zero is out of range too', Object.keys(normalizeCustom({ taskSettings: { x: { points: 0 } } }).taskSettings).length, 0)
  is('but a big job is allowed to be a big job', normalizeCustom({ taskSettings: { x: { points: 999 } } }).taskSettings.x.points, 999)
  is('a real setting survives the round trip', normalizeCustom(edited).taskSettings['kitchen-dishes'].points, 9)

  // =========================================================================
  // Starting fresh
  // =========================================================================

  const backlog = [daysAgo(40)]
  const fresh = startFresh({}, MON)

  is('nothing is fresh by default', hasFreshStart({}), false)
  is('starting fresh records the day', hasFreshStart(fresh), true)
  is('a long-overdue chore is overdue without it', st('litter-full-change', backlog, MON).status, STATUS.OVERDUE)
  is('and merely due with it', getTaskState(task('litter-full-change'), backlog, MON, fresh).status, STATUS.DUE)
  is('worded without blame', getTaskState(task('litter-full-change'), backlog, MON, fresh).detail, 'Worth doing when you can')
  is('a chore never logged at all is covered too', getTaskState(task('bath1-mirror'), [], SUN, fresh).status, STATUS.DUE)
  is('something done since the line is untouched', getTaskState(task('kitchen-dishes'), [MON.getTime()], MON, fresh).status, STATUS.DONE)
  is('the scene goes lively again', sceneMood({ completions: { 'chickens-checkin': backlog } }, MON, ALL_TASKS, null, fresh), MOOD.LIVELY)

  // The whole point: it changes what is *said*, never what is *stored*.
  const historyBefore = JSON.stringify({ completions: { 'kitchen-dishes': [daysAgo(0), daysAgo(1)] } })
  const streakLog2 = JSON.parse(historyBefore)
  is('the streak is untouched', currentStreak(streakLog2, MON, null, fresh), currentStreak(streakLog2, MON))
  is('and so are the credits', creditsEarned(streakLog2, ALL_TASKS, 'me', [{ id: 'me' }]), 8)
  is('and the history itself', JSON.stringify(streakLog2), historyBefore)

  is('undoing it brings the honest answer back', getTaskState(task('litter-full-change'), backlog, MON, clearFreshStart(fresh)).status, STATUS.OVERDUE)
  is('a fresh start survives being stored', normalizeAway(fresh).freshStartAt, fresh.freshStartAt)
  is('and rides alongside a trip', hasFreshStart(addWindow(fresh, day(3).getTime(), day(1).getTime())), true)
  is('while the trip still works', isAway(addWindow(fresh, day(1).getTime(), day(-1).getTime()), MON), true)

  // =========================================================================
  // Whose job is it
  // =========================================================================

  const HOUSE = [{ id: 'eddie', name: 'Eddie' }, { id: 'yas', name: 'Yasmine' }]
  const nameOf = (id) => HOUSE.find((p) => p.id === id)?.name ?? 'Someone'
  const chore = (assignee) => ({ id: 'litter-scoop', assignee })

  is('an unassigned chore is nobody in particular', whoseTurn(chore(undefined), [], HOUSE), null)
  is('and stays that way however much it is logged', whoseTurn(chore(null), [{ at: MON.getTime(), by: 'yas' }], HOUSE), null)
  is('an assigned chore is that person', whoseTurn(chore('yas'), [], HOUSE), 'yas')
  is('logging it does not move it', whoseTurn(chore('yas'), [{ at: MON.getTime(), by: 'eddie' }], HOUSE), 'yas')

  // A rotation is worked out from the log, not stored — one record of who did
  // what, so the scene, the credits and this can never disagree.
  is('a rotation nobody has done starts at the top', whoseTurn(chore(ROTATE), [], HOUSE), 'eddie')
  is('after Eddie it is Yasmine', whoseTurn(chore(ROTATE), [{ at: MON.getTime(), by: 'eddie' }], HOUSE), 'yas')
  is('after Yasmine it is Eddie again', whoseTurn(chore(ROTATE), [{ at: MON.getTime(), by: 'yas' }], HOUSE), 'eddie')
  is(
    'only the most recent log decides',
    whoseTurn(chore(ROTATE), [{ at: daysAgo(4), by: 'yas' }, { at: daysAgo(0), by: 'eddie' }], HOUSE),
    'yas',
  )
  is('an entry with no by is nobody, so it starts over', whoseTurn(chore(ROTATE), [MON.getTime()], HOUSE), 'eddie')
  is('the newest entry is found whatever order they arrive in', lastLoggedBy([{ at: daysAgo(0), by: 'eddie' }, { at: daysAgo(9), by: 'yas' }]), 'eddie')

  // Somebody who has left is not whose turn it is any more.
  is('a chore assigned to someone gone reads as unassigned', whoseTurn(chore('ghost'), [], HOUSE), null)
  is('and a rotation past them starts over', whoseTurn(chore(ROTATE), [{ at: MON.getTime(), by: 'ghost' }], HOUSE), 'eddie')
  is('a one-person house rotates to itself', whoseTurn(chore(ROTATE), [{ at: MON.getTime(), by: 'me' }], [{ id: 'me', name: 'Me' }]), 'me')
  is('an empty roster is nobody', whoseTurn(chore(ROTATE), [], []), null)

  is('isTurnOf agrees', isTurnOf(chore('yas'), [], HOUSE, 'yas'), true)
  is('and disagrees', isTurnOf(chore('yas'), [], HOUSE, 'eddie'), false)
  is('nobody has a turn on an unassigned chore', isTurnOf(chore(null), [], HOUSE, 'eddie'), false)

  // Wording: whose turn it is, never that somebody missed theirs.
  is('your own reads as yours', turnLabel(chore('eddie'), [], HOUSE, 'eddie', nameOf), 'Yours')
  is('somebody else reads as their name', turnLabel(chore('yas'), [], HOUSE, 'eddie', nameOf), 'Yasmine')
  is('a rotation on you reads as your turn', turnLabel(chore(ROTATE), [], HOUSE, 'eddie', nameOf), 'Your turn')
  is('a rotation on them says whose turn', turnLabel(chore(ROTATE), [{ at: MON.getTime(), by: 'eddie' }], HOUSE, 'eddie', nameOf), "Yasmine's turn")
  is('unassigned says nothing at all', turnLabel(chore(null), [], HOUSE, 'eddie', nameOf), null)
  is(
    'and none of it is ever a telling off',
    /late|overdue|missed|failed|behind/i.test(
      [
        turnLabel(chore('yas'), [], HOUSE, 'eddie', nameOf),
        turnLabel(chore(ROTATE), [], HOUSE, 'eddie', nameOf),
      ].join(' '),
    ),
    false,
  )

  // "Mine" keeps what nobody has claimed — an unassigned chore is everybody's.
  const queue = [
    { task: chore('eddie') },
    { task: { id: 'kitchen-dishes', assignee: 'yas' } },
    { task: { id: 'chickens-checkin' } },
  ]
  is('mine keeps mine and the unclaimed', mineOf(queue, { completions: {} }, HOUSE, 'eddie').length, 2)
  is('and drops what is squarely theirs', mineOf(queue, { completions: {} }, HOUSE, 'eddie').some((q) => q.task.id === 'kitchen-dishes'), false)
  is('with no active person nothing is filtered', mineOf(queue, { completions: {} }, HOUSE, null).length, 3)

  // Assignment is an override like any other, so it cannot move an id.
  const assigned = updateTaskSettings(emptyCustom, 'litter-scoop', { assignee: 'yas' })
  is('assignment stores against the task id', assigned.taskSettings['litter-scoop'].assignee, 'yas')
  is('and survives being written out', normalizeCustom(assigned).taskSettings['litter-scoop'].assignee, 'yas')
  is('it reaches the task through compose', composeAreas(assigned).flatMap((a) => a.tasks).find((t) => t.id === 'litter-scoop').assignee, 'yas')
  is('unassigning takes the whole entry with it', Object.keys(updateTaskSettings(assigned, 'litter-scoop', { assignee: null }).taskSettings).length, 0)
  is('but leaves other overrides alone', updateTaskSettings(updateTaskSettings(assigned, 'litter-scoop', { points: 7 }), 'litter-scoop', { assignee: null }).taskSettings['litter-scoop'].points, 7)
  is('a non-string assignee is refused', normalizeCustom({ taskSettings: { x: { assignee: 42 } } }).taskSettings.x, undefined)

  // =========================================================================
  // Starting over
  // =========================================================================

  // Everything else in the app is additive. This is the one thing that takes
  // something away, so what it does and doesn't touch is asserted exactly.
  const setUp = updateTaskSettings(
    addTaskFixture(),
    'kitchen-dishes',
    { points: 9, assignee: 'yas', repeatable: true },
  )
  const setUpBefore = JSON.stringify(setUp)
  const busyLog = { version: 2, completions: { 'kitchen-dishes': [daysAgo(0), daysAgo(1)], 'litter-scoop': [daysAgo(2)] } }
  const spentEstate = buyItem({}, 'eddie', HOME, fern, 500)
  const trips = addWindow(startFresh({}, MON), day(9).getTime(), day(5).getTime())

  const wiped = hardReset({ away: trips })
  is('every completion goes', Object.keys(wiped.log.completions).length, 0)
  is('so does everything bought', Object.keys(wiped.estate).length, 0)
  is('the fresh-start line goes with the backlog it covered', wiped.away.freshStartAt, 0)
  is('but trips stay — they are where you were, not what you did', wiped.away.windows.length, 1)

  is('the streak is zero afterwards', currentStreak(wiped.log, MON, ALL_TASKS), 0)
  is('and so are the points', weeklyPoints(wiped.log, MON, ALL_TASKS), 0)
  is('and the credits earned', creditsEarned(wiped.log, ALL_TASKS, 'eddie', ROSTER), 0)
  is('and the balance', creditsBalance(wiped.log, ALL_TASKS, 'eddie', ROSTER, entryFor(wiped.estate, 'eddie')), 0)

  // The load-bearing half: what you set up is not what you did.
  is('nothing you set up is even readable from here', JSON.stringify(setUp), setUpBefore)
  is('an added task is still there afterwards', composeAreas(setUp).flatMap((a) => a.tasks).some((t) => t.id === 'kitchen-my-thing'), true)
  is('and an edited one keeps its points', composeAreas(setUp).flatMap((a) => a.tasks).find((t) => t.id === 'kitchen-dishes').points, 9)
  is('and whose job it is', composeAreas(setUp).flatMap((a) => a.tasks).find((t) => t.id === 'kitchen-dishes').assignee, 'yas')
  is('and that it repeats', composeAreas(setUp).flatMap((a) => a.tasks).find((t) => t.id === 'kitchen-dishes').repeatable, true)
  is('a reset with nothing passed still works', Object.keys(hardReset().log.completions).length, 0)

  // The confirmation has to state the real cost — nobody should have to guess
  // at the size of something irreversible.
  const cost = resetSummary(busyLog, spentEstate)
  is('it counts every entry', cost.logged, 3)
  is('across every task', cost.tasks, 2)
  is('and what was bought', cost.bought, 1)
  is('and what it cost', cost.spent, fern.cost)
  is('an untouched app has nothing to clear', resetSummary({ completions: {} }, {}).logged, 0)

  // A reset has to survive the other phone, which still holds all of it and
  // would otherwise push it back — merging is a union in every other case.
  const stale = { 'kitchen-dishes': [{ at: daysAgo(3) }, { at: daysAgo(1) }] }
  is('without a reset, a union keeps everything', Object.keys(mergeCompletions(stale, [])).length, 1)
  is('a reset drops what came before it', Object.keys(mergeCompletions(stale, [], daysAgo(0))).length, 0)
  is(
    'but keeps what was logged since',
    mergeCompletions({ 'kitchen-dishes': [{ at: daysAgo(3) }, { at: MON.getTime() }] }, [], daysAgo(1))['kitchen-dishes'].length,
    1,
  )
  is('and a null reset changes nothing', mergeCompletions(stale, [], null)['kitchen-dishes'].length, 2)

  // =========================================================================
  // Today: the place, the drive, and the scratch list
  // =========================================================================

  // --- the maps link ------------------------------------------------------

  is('an Apple phone gets Apple Maps', preferredMaps('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)'), 'apple')
  is('an iPad too', preferredMaps('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)'), 'apple')
  is('everything else gets Google', preferredMaps('Mozilla/5.0 (Linux; Android 14; Pixel 8)'), 'google')
  is('and so does an unknown agent', preferredMaps(''), 'google')
  is('the other one is the other one', otherMaps('apple'), 'google')
  is('both ways round', otherMaps('google'), 'apple')
  is('both are named', `${MAPS_NAMES.apple}/${MAPS_NAMES.google}`, 'Apple Maps/Google Maps')

  is(
    'the Apple link asks for driving directions',
    buildMapsLink('100 Main St, Kalamazoo MI', 'apple'),
    'https://maps.apple.com/?daddr=100%20Main%20St%2C%20Kalamazoo%20MI&dirflg=d',
  )
  is(
    'the Google link does too',
    buildMapsLink('100 Main St', 'google'),
    'https://www.google.com/maps/dir/?api=1&destination=100%20Main%20St&travelmode=driving',
  )
  // The origin is deliberately absent so the maps app uses current location.
  is('neither link carries an origin', /saddr|[?&]origin=/.test(buildMapsLink('x', 'apple') + buildMapsLink('x', 'google')), false)

  // An ampersand or a hash in an address would otherwise cut the URL in half.
  const awkward = 'Unit 3 & 4, Apt #2, Kalamazoo'
  const awkwardLink = buildMapsLink(awkward, 'google')
  is('an awkward address is encoded, not truncated', awkwardLink.includes('%26') && awkwardLink.includes('%232'), true)
  is('and survives the round trip', decodeURIComponent(new URL(awkwardLink).searchParams.get('destination')), awkward)
  is('an empty destination has no link', buildMapsLink('   ', 'apple'), null)
  is('and neither does a missing one', buildMapsLink(null), null)

  // --- the places store ---------------------------------------------------

  is('nothing is set by default', hasPlaces(emptyPlaces), false)
  is('junk normalises to empty', JSON.stringify(normalizePlaces('nonsense')), JSON.stringify(emptyPlaces))
  is('and so does a null', JSON.stringify(normalizePlaces(null)), JSON.stringify(emptyPlaces))

  const town = { query: 'Kalamazoo', label: 'Kalamazoo, Michigan', latitude: 42.29, longitude: -85.59, units: UNITS.F }
  const withHome = setHome(emptyPlaces, town)
  is('a home is kept', withHome.home.label, 'Kalamazoo, Michigan')
  is('a home without coordinates is not', setHome(emptyPlaces, { query: 'Nowhere' }).home, null)
  is('a home with no name is not either', setHome(emptyPlaces, { latitude: 1, longitude: 2 }).home, null)
  is('the units follow the home', setUnits(withHome, UNITS.C).home.units, UNITS.C)
  is('and a nonsense unit falls back', normalizePlaces({ home: { ...town, units: 'kelvin' } }).home.units, defaultUnits())
  is('US English wants Fahrenheit', defaultUnits('en-US'), UNITS.F)
  is('everyone else wants Celsius', defaultUnits('en-GB'), UNITS.C)

  const withWork = setWork(withHome, '  100 Main St  ')
  is('a work address is trimmed', withWork.work, '100 Main St')
  is('an empty one is dropped', setWork(withHome, '   ').work, null)
  is('forgetting the town keeps the work address', clearHome(withWork).work, '100 Main St')
  is('and forgetting work keeps the town', clearWork(withWork).home.label, 'Kalamazoo, Michigan')
  is('both gone means nothing set', hasPlaces(clearWork(clearHome(withWork))), false)

  // --- the scratch list ---------------------------------------------------

  is('the list starts empty', openItems(emptyDaily).length, 0)
  is('junk normalises to empty', normalizeDaily(42).items.length, 0)
  is('a blank item is not an item', addItem(emptyDaily, '   ').items.length, 0)

  const list1 = addItem(addItem(emptyDaily, 'Call the vet'), 'Pick up feed')
  is('two items go on', list1.items.length, 2)
  is('in the order they were written', list1.items[0].text, 'Call the vet')
  is('each gets its own id', new Set(list1.items.map((i) => i.id)).size, 2)
  is('long text is cut, not rejected', addItem(emptyDaily, 'x'.repeat(400)).items[0].text.length, MAX_TEXT)

  const ticked = toggleItem(list1, list1.items[0].id, MON.getTime())
  is('ticking moves it out of the open list', openItems(ticked).length, 1)
  is('and into the done one', doneItems(ticked)[0].text, 'Call the vet')
  is('unticking puts it back', openItems(toggleItem(ticked, list1.items[0].id)).length, 2)
  is('removing takes it away', removeItem(list1, list1.items[0].id).items.length, 1)
  is('removing something absent is harmless', removeItem(list1, 'nope').items.length, 2)

  // Ticked yesterday, gone today. Untouched items wait as long as they like —
  // nothing here is ever called late.
  const yesterday = { items: [
    { id: 'a', text: 'Ticked yesterday', at: daysAgo(1), doneAt: daysAgo(1) },
    { id: 'b', text: 'Still waiting', at: daysAgo(9), doneAt: 0 },
  ] }
  const pruned = pruneDaily(yesterday, MON)
  is('a ticked item from yesterday is pruned', pruned.items.length, 1)
  is('an untouched old one stays', pruned.items[0].text, 'Still waiting')
  is('and is never labelled late', /late|overdue|missed/i.test(JSON.stringify(pruned)), false)
  is('ticked today survives the prune', pruneDaily({ items: [{ id: 'c', text: 'Done', at: MON.getTime(), doneAt: MON.getTime() }] }, MON).items.length, 1)
  is('the list is capped', addManyItems(60).items.length, 40)

  // The load-bearing claim: a scratch list cannot move a single number.
  const beforeList = JSON.stringify({ completions: { 'kitchen-dishes': [daysAgo(0), daysAgo(1)] } })
  const listLog = JSON.parse(beforeList)
  const pointsBefore = weeklyPoints(listLog, MON, ALL_TASKS)
  const streakBefore = currentStreak(listLog, MON, ALL_TASKS)
  const creditsBefore = creditsEarned(listLog, ALL_TASKS, 'me', [{ id: 'me' }])
  addItem(addItem(emptyDaily, 'Call the vet'), 'Pick up feed')
  is('the history is untouched by the list', JSON.stringify(listLog), beforeList)
  is('and so are the points', weeklyPoints(listLog, MON, ALL_TASKS), pointsBefore)
  is('and the streak', currentStreak(listLog, MON, ALL_TASKS), streakBefore)
  is('and the credits', creditsEarned(listLog, ALL_TASKS, 'me', [{ id: 'me' }]), creditsBefore)

  // --- the forecast -------------------------------------------------------

  is('every WMO code has a label', ALL_CODES.every((code) => typeof describeCode(code).label === 'string' && describeCode(code).label), true)
  is('every WMO code has an icon', ALL_CODES.every((code) => Boolean(describeCode(code).icon)), true)
  is('an unknown code is still weather', describeCode(1234).label, 'Weather')
  is('clear is clear', describeCode(0).label, 'Clear')
  is('95 is a thunderstorm', describeCode(95).label, 'Thunderstorm')
  is('the code set is complete', ALL_CODES.length, 28)

  is('Fahrenheit rounds and signs', formatTemp(63.6, UNITS.F), '64°F')
  is('so does Celsius', formatTemp(17.4, UNITS.C), '17°C')
  is('a missing reading is a dash, never NaN', formatTemp(undefined, UNITS.F), '—')
  is('the symbols are right', `${unitSymbol(UNITS.F)}${unitSymbol(UNITS.C)}`, '°F°C')

  is('a place reads as town and region', placeLabel({ name: 'Kalamazoo', admin1: 'Michigan', country_code: 'US' }), 'Kalamazoo, Michigan')
  is('a bare town still reads', placeLabel({ name: 'Kalamazoo' }), 'Kalamazoo')

  const reading = readingFrom(
    {
      current: { temperature_2m: 64, weather_code: 3, is_day: 1 },
      daily: { weather_code: [61], temperature_2m_max: [70], temperature_2m_min: [50], precipitation_probability_max: [40] },
    },
    UNITS.F,
  )
  is('the reading takes the current temperature', reading.temperature, 64)
  is('and today\'s high', reading.high, 70)
  is('and the chance of rain', reading.rainChance, 40)
  is('an empty response does not throw', readingFrom({}, UNITS.F).temperature, null)

  is('a reading with no timestamp is stale', isStale(null), true)
  is('a fresh one is not', isStale({ at: Date.now() }), false)
  is('an old one is', isStale({ at: Date.now() - STALE_MS - 1 }), true)
  is('the boundary counts as stale', isStale({ at: 1000 }, 1000 + STALE_MS), true)
  is('a cache key includes the units', cacheKey(town).endsWith(UNITS.F), true)
  is('changing units changes the key', cacheKey(setUnits(withHome, UNITS.C).home) === cacheKey(town), false)
  is('no home means no key', cacheKey(null), null)

  // --- backups carry both -------------------------------------------------

  const carried = parseBackup(
    JSON.stringify(buildBackup({ completions: {} }, {}, null, null, null, null, withWork, list1)),
  )
  is('a backup carries the town', carried.places.home.label, 'Kalamazoo, Michigan')
  is('and the work address', carried.places.work, '100 Main St')
  is('and today\'s list', carried.daily.items.length, 2)

  // A file from before this feature existed restores to empty, not undefined.
  const older = JSON.parse(JSON.stringify(buildBackup({ completions: {} }, {}, null, null, null, null)))
  delete older.places
  delete older.daily
  const restoredOld = parseBackup(JSON.stringify(older))
  is('an older backup has no places', restoredOld.places.home, null)
  is('and an empty list', restoredOld.daily.items.length, 0)
}

/** Enough items to test the cap without writing sixty lines. */
function addManyItems(count) {
  let list = emptyDaily
  for (let i = 0; i < count; i += 1) list = addItem(list, `Item ${i}`)
  return list
}


/** A one-task custom store, so the "same map for both kinds" claim is tested. */
function addTaskFixture() {
  return normalizeCustom({
    tasks: {
      kitchen: [{ id: 'kitchen-my-thing', name: 'My thing', schedule: { kind: 'weekly' }, points: 3 }],
    },
  })
}
