// Turns a task's schedule + its completion history into a status you can render.
//
// There are two families of schedule:
//
//   Window schedules  - "do this N times inside this window" (today / this week /
//                        this week if it's your turn). Logging inside the window
//                        counts; the window then resets on its own.
//   Interval schedules - "do this again N days/months after the last time".
//
// Statuses:
//   done     - finished for the current window (or done today, for intervals)
//   due      - it's time, go do it
//   overdue  - the window is closing / it's been too long
//   resting  - not your turn today (e.g. Tuesday for a Mon/Wed/Fri task)
//   upcoming - scheduled, but not yet

import { timeOf } from './storage.js'
import { inGrace, isAway, pardoned } from './away.js'
import {
  DAY_NAMES,
  DAY_SHORT,
  addDays,
  daysBetween,
  startOfDay,
  startOfWeek,
  weekIndex,
  weekPosition,
} from './date.js'

export const STATUS = {
  DONE: 'done',
  DUE: 'due',
  OVERDUE: 'overdue',
  RESTING: 'resting',
  UPCOMING: 'upcoming',
}

/** Statuses that mean "this is on your plate right now". */
export function isActionable(status) {
  return status === STATUS.DUE || status === STATUS.OVERDUE
}

const INTERVAL_KINDS = new Set(['everyNDays', 'everyNMonths'])

function intervalLength(schedule) {
  return schedule.kind === 'everyNDays' ? schedule.days : Math.round(schedule.months * 30)
}

/** The window a window-schedule counts completions inside. */
function currentWindow(schedule, now) {
  if (schedule.kind === 'daily' || schedule.kind === 'weekdays') {
    const start = startOfDay(now)
    return { start, end: addDays(start, 1) }
  }
  const start = startOfWeek(now)
  return { start, end: addDays(start, 7) }
}

/** Is this task "open for business" right now, or is today a rest day? */
function isWindowActive(schedule, now) {
  const dayOfWeek = now.getDay()
  switch (schedule.kind) {
    case 'daily':
    case 'timesPerWeek':
    case 'weekly':
      return true
    case 'weekdays':
      return schedule.days.includes(dayOfWeek)
    case 'weeklyOn':
      // Available from its day onwards, so a missed Friday can still be caught up on Sunday.
      return weekPosition(dayOfWeek) >= weekPosition(schedule.day)
    case 'weekend':
      return dayOfWeek === 6 || dayOfWeek === 0
    case 'rotatingWeek':
      return weekIndex(now) % schedule.cycle === schedule.offset
    default:
      return true
  }
}

function windowTarget(schedule) {
  return schedule.kind === 'timesPerWeek' ? schedule.times : 1
}

/**
 * The three reasons a status gets softened, applied once, here, at the end —
 * so all nine schedule kinds are covered by one rule, and so every other part
 * of the app (the queue, the progress bars, the credits scene) inherits the
 * same answer rather than inventing a second definition of "behind".
 *
 * Done always stays done: you might well log something from the road.
 */
function applyGrace(state, away, now) {
  if (!away || state.status === STATUS.DONE) return state

  // 1. Nobody is home, so nothing is on anyone's plate.
  if (isAway(away, now)) {
    if (!isActionable(state.status)) return state
    return { ...state, status: STATUS.RESTING, detail: 'Away' }
  }

  if (state.status !== STATUS.OVERDUE) return state

  // 2. Just back from a trip — a list, not a reckoning.
  if (inGrace(away, now)) {
    return { ...state, status: STATUS.DUE, detail: 'Back home — worth a look' }
  }

  // 3. A line was drawn under the backlog and this hasn't been done since. It
  //    stays on the list, it just stops being an accusation.
  if (pardoned(away, state.lastDone)) {
    return { ...state, status: STATUS.DUE, detail: 'Worth doing when you can' }
  }

  return state
}

/**
 * @param {object} task        a task from src/config/areas.js
 * @param {Array} completions  entries {at, by}, newest first
 * @param {Date} now
 * @param {object} away        the away store, or null when nobody's travelling
 */
export function getTaskState(task, completions = [], now = new Date(), away = null) {
  return applyGrace(computeTaskState(task, completions, now), away, now)
}

function computeTaskState(task, completions, now) {
  const schedule = task.schedule
  const lastDone = completions.length ? timeOf(completions[0]) : null

  if (INTERVAL_KINDS.has(schedule.kind)) {
    const interval = intervalLength(schedule)
    const grace = schedule.grace ?? Math.max(1, Math.round(interval * 0.25))

    if (!lastDone) {
      return { status: STATUS.DUE, done: 0, target: 1, lastDone: null, detail: 'Not logged yet' }
    }

    const sinceDays = daysBetween(lastDone, now)
    const dueIn = interval - sinceDays

    if (sinceDays === 0) {
      return { status: STATUS.DONE, done: 1, target: 1, lastDone, detail: 'Done today' }
    }
    if (dueIn > 0) {
      return {
        status: STATUS.UPCOMING,
        done: 0,
        target: 1,
        lastDone,
        detail: dueIn === 1 ? 'Due tomorrow' : `Due in ${dueIn} days`,
      }
    }
    if (sinceDays >= interval + grace) {
      return {
        status: STATUS.OVERDUE,
        done: 0,
        target: 1,
        lastDone,
        detail: `${sinceDays - interval} days past due`,
      }
    }
    return { status: STATUS.DUE, done: 0, target: 1, lastDone, detail: 'Due now' }
  }

  // ---- window schedules ----
  const { start, end } = currentWindow(schedule, now)
  const target = windowTarget(schedule)
  const done = completions.filter((e) => {
    const at = timeOf(e)
    return at >= start.getTime() && at < end.getTime()
  }).length

  if (done >= target) {
    return {
      status: STATUS.DONE,
      done,
      target,
      lastDone,
      detail: target > 1 ? `${done} of ${target} done` : 'Done',
    }
  }

  if (!isWindowActive(schedule, now)) {
    return { status: STATUS.RESTING, done, target, lastDone, detail: nextDayLabel(schedule, now) }
  }

  const isLastDayOfWindow =
    schedule.kind === 'daily' || schedule.kind === 'weekdays' ? false : now.getDay() === 0 // Sunday closes a weekly window

  const detail = target > 1 ? `${done} of ${target} done` : 'Due now'
  return {
    status: isLastDayOfWindow ? STATUS.OVERDUE : STATUS.DUE,
    done,
    target,
    lastDone,
    detail: isLastDayOfWindow ? `Last day — ${detail.toLowerCase()}` : detail,
  }
}

/** "Wednesday" / "Friday" / "In 2 weeks" — when a resting task wakes up again. */
function nextDayLabel(schedule, now) {
  switch (schedule.kind) {
    case 'weekdays': {
      for (let i = 1; i <= 7; i += 1) {
        const candidate = addDays(now, i)
        if (schedule.days.includes(candidate.getDay())) return `Next: ${DAY_NAMES[candidate.getDay()]}`
      }
      return 'Scheduled'
    }
    case 'weeklyOn':
      return `Next: ${DAY_NAMES[schedule.day]}`
    case 'weekend':
      return 'Next: this weekend'
    case 'rotatingWeek': {
      const current = weekIndex(now) % schedule.cycle
      const weeksAway = (schedule.offset - current + schedule.cycle) % schedule.cycle
      return weeksAway === 1 ? 'Next week' : `In ${weeksAway} weeks`
    }
    default:
      return 'Scheduled'
  }
}

/** Human label for how often a task happens, shown under the task name. */
export function scheduleLabel(schedule) {
  switch (schedule.kind) {
    case 'daily':
      return 'Every day'
    case 'weekdays':
      return schedule.days.map((d) => DAY_SHORT[d]).join(' · ')
    case 'timesPerWeek':
      return `${schedule.times}x per week`
    case 'weekly':
      return 'Once a week'
    case 'weeklyOn':
      return `Every ${DAY_NAMES[schedule.day]}`
    case 'weekend':
      return 'Saturday or Sunday'
    case 'rotatingWeek':
      return `1 week in ${schedule.cycle} (rotation)`
    case 'everyNDays':
      if (schedule.days === 14) return 'Every 2 weeks'
      return schedule.grace ? `Every ${schedule.days}-${schedule.days + schedule.grace} days` : `Every ${schedule.days} days`
    case 'everyNMonths':
      return schedule.months === 3 ? 'Every 3 months' : `Every ${schedule.months} months`
    default:
      return ''
  }
}

/** Next calendar date this task should happen — the DTSTART for calendar export. */
export function nextOccurrence(task, completions = [], now = new Date()) {
  const schedule = task.schedule
  const today = startOfDay(now)

  if (INTERVAL_KINDS.has(schedule.kind)) {
    if (!completions.length) return today
    const next = addDays(startOfDay(timeOf(completions[0])), intervalLength(schedule))
    return next < today ? today : next
  }

  const preferredDay = icsPreferredDays(schedule)[0]
  if (preferredDay === undefined) return today

  for (let i = 0; i < 7 * (schedule.cycle ?? 1) + 7; i += 1) {
    const candidate = addDays(today, i)
    if (candidate.getDay() !== preferredDay) continue
    if (schedule.kind === 'rotatingWeek' && weekIndex(candidate) % schedule.cycle !== schedule.offset) {
      continue
    }
    return candidate
  }
  return today
}

/**
 * Which weekdays this task should show up on in a calendar app.
 * `calendarDays` in the task config wins, so flexible tasks ("2x per week")
 * still land somewhere sensible instead of nowhere.
 */
export function icsPreferredDays(schedule) {
  if (schedule.calendarDays) return schedule.calendarDays
  switch (schedule.kind) {
    case 'daily':
      return [0, 1, 2, 3, 4, 5, 6]
    case 'weekdays':
      return schedule.days
    case 'timesPerWeek':
      return [2, 6] // Tuesday and Saturday
    case 'weekly':
      return [1] // Monday
    case 'weeklyOn':
      return [schedule.day]
    case 'weekend':
      return [6]
    case 'rotatingWeek':
      return [schedule.day ?? 6]
    default:
      return []
  }
}
