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
}
