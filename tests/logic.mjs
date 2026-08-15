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
  CATALOG,
  COMPANION_COST,
  MAX_COMPANIONS,
  TREAT_COST,
  TREAT_HOURS,
  itemById,
} from '../src/config/catalog.js'
import { MOOD, creditsBalance, creditsEarned, owns, sceneMood } from '../src/lib/credits.js'
import {
  buyCompanion,
  buyItem,
  buyTreat,
  entryFor,
  equip,
  normalizeEstate,
} from '../src/lib/estate.js'
import { buildBackup, parseBackup } from '../src/lib/backup.js'
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
  is('itemById finds one', itemById('vessel-fern')?.slot, 'vessel')
  is('itemById shrugs at nonsense', itemById('nope'), null)
  is(
    'every look has the estate copy it needs',
    THEME_LIST.every((t) => t.copy.estateTitle && t.copy.shopTitle && t.copy.creditsUnit),
    true,
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
  const fern = itemById('vessel-fern')
  let estate = {}
  estate = buyItem(estate, 'eddie', fern, 40)
  is('a purchase you cannot afford is refused', Object.keys(estate).length, 0)

  estate = buyItem(estate, 'eddie', fern, 200)
  is('buying records the spend', entryFor(estate, 'eddie').spent, fern.cost)
  is('buying wears it straight away', entryFor(estate, 'eddie').equipped.vessel, 'vessel-fern')
  is('and it is owned', owns(entryFor(estate, 'eddie'), 'vessel-fern'), true)

  estate = buyItem(estate, 'eddie', fern, 200)
  is('buying the same thing twice charges once', entryFor(estate, 'eddie').spent, fern.cost)

  estate = equip(estate, 'eddie', 'vessel-fern')
  is('equipping what is worn takes it off', entryFor(estate, 'eddie').equipped.vessel, undefined)
  estate = equip(estate, 'eddie', 'vessel-monstera')
  is('you cannot wear what you do not own', entryFor(estate, 'eddie').equipped.vessel, undefined)

  is("one person's spending is their own", entryFor(estate, 'yas').spent, 0)

  const bigLog = { completions: { 'kitchen-dishes': Array.from({ length: 30 }, (_, i) => ({ at: daysAgo(i), by: 'eddie' })) } }
  is('balance is earned minus spent', creditsBalance(bigLog, ALL_TASKS, 'eddie', ROSTER, entryFor(estate, 'eddie')), 120 - fern.cost)
  is(
    'balance never goes negative',
    creditsBalance({ completions: {} }, ALL_TASKS, 'eddie', ROSTER, { spent: 9999 }),
    0,
  )

  // --- companions and the consumable ---
  let many = {}
  for (let i = 0; i < MAX_COMPANIONS + 2; i += 1) many = buyCompanion(many, 'eddie', COMPANION_COST, 99999)
  is('companions stop at the cap', entryFor(many, 'eddie').companions.length, MAX_COMPANIONS)
  is('and only the ones bought were charged', entryFor(many, 'eddie').spent, MAX_COMPANIONS * COMPANION_COST)

  const T0 = MON.getTime()
  let treated = buyTreat({}, 'eddie', TREAT_COST, 10, T0)
  is('a treat you cannot afford is refused', Object.keys(treated).length, 0)
  treated = buyTreat({}, 'eddie', TREAT_COST, 500, T0)
  is('a treat lasts its full run', entryFor(treated, 'eddie').boostUntil, T0 + TREAT_HOURS * 3600000)
  treated = buyTreat(treated, 'eddie', TREAT_COST, 500, T0)
  is('buying again extends rather than replaces', entryFor(treated, 'eddie').boostUntil, T0 + 2 * TREAT_HOURS * 3600000)

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
    eddie: { owned: ['vessel-fern', 'not-a-thing'], equipped: { vessel: 'vessel-orchid', flair: 'vessel-fern' }, spent: 80 },
  })
  is('an unknown purchase is kept, not dropped', salvaged.eddie.owned.length, 2)
  is('but something unowned is never worn', salvaged.eddie.equipped.vessel, undefined)
  is('and nothing is worn in the wrong slot', salvaged.eddie.equipped.flair, undefined)

  // --- backups carry it ---
  const restored = parseBackup(JSON.stringify(buildBackup(shared, {}, null, null, estate)))
  is('a backup restores the estate', restored.estate.eddie.spent, fern.cost)
  const old = parseBackup(JSON.stringify({ app: 'home-maintenance-dashboard', version: 2, completions: {} }))
  is('a backup from before the shop still reads', Object.keys(old.estate).length, 0)
}
