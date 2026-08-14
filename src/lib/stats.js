// Streaks, points and progress. All of it is encouragement, none of it is a
// punishment: nothing here can go negative and nothing scolds you.

import { ALL_TASKS } from '../config/areas.js'
import { MS_PER_DAY, daysBetween, startOfDay, startOfWeek } from './date.js'
import { STATUS, getTaskState, isActionable } from './schedule.js'

/** Every completion timestamp across every task, newest first. */
function allCompletions(log) {
  return Object.values(log.completions).flat().sort((a, b) => b - a)
}

/**
 * Consecutive days ending today (or yesterday, so an evening person doesn't
 * lose the streak at midnight) where at least one task was logged.
 */
export function currentStreak(log, now = new Date()) {
  const days = new Set(
    allCompletions(log).map((t) => startOfDay(new Date(t)).getTime()),
  )
  if (days.size === 0) return 0

  const today = startOfDay(now).getTime()
  const yesterday = today - MS_PER_DAY

  let cursor
  if (days.has(today)) cursor = today
  else if (days.has(yesterday)) cursor = yesterday
  else return 0

  let streak = 0
  while (days.has(cursor)) {
    streak += 1
    cursor -= MS_PER_DAY
  }
  return streak
}

/** Points earned since Monday. */
export function weeklyPoints(log, now = new Date()) {
  const weekStart = startOfWeek(now).getTime()
  let total = 0
  for (const task of ALL_TASKS) {
    const stamps = log.completions[task.id] ?? []
    const count = stamps.filter((t) => t >= weekStart).length
    total += count * (task.points ?? 1)
  }
  return total
}

/** Total points available this week, so the progress bar has a ceiling. */
export function weeklyPointsGoal(now = new Date()) {
  let total = 0
  for (const task of ALL_TASKS) {
    const s = task.schedule
    let timesThisWeek = 0
    switch (s.kind) {
      case 'daily':
        timesThisWeek = 7
        break
      case 'weekdays':
        timesThisWeek = s.days.length
        break
      case 'timesPerWeek':
        timesThisWeek = s.times
        break
      case 'weekly':
      case 'weeklyOn':
      case 'weekend':
        timesThisWeek = 1
        break
      case 'rotatingWeek':
        timesThisWeek = 1 / s.cycle
        break
      case 'everyNDays':
        timesThisWeek = 7 / s.days
        break
      case 'everyNMonths':
        timesThisWeek = 7 / (s.months * 30)
        break
      default:
        timesThisWeek = 0
    }
    total += timesThisWeek * (task.points ?? 1)
  }
  return Math.max(1, Math.round(total))
}

/** How many completions happened today, across everything. */
export function completedToday(log, now = new Date()) {
  const dayStart = startOfDay(now).getTime()
  return allCompletions(log).filter((t) => t >= dayStart).length
}

/**
 * Progress for a set of tasks: done vs. everything actually on the plate.
 * Tasks that are resting or not due yet are left out, so a quiet day still
 * reads as 100% instead of guilt-tripping you.
 */
export function progressFor(tasks, log, now = new Date()) {
  let done = 0
  let open = 0
  for (const task of tasks) {
    const state = getTaskState(task, log.completions[task.id] ?? [], now)
    if (state.status === STATUS.DONE) done += 1
    else if (isActionable(state.status)) open += 1
  }
  const total = done + open
  return {
    done,
    open,
    total,
    percent: total === 0 ? 100 : Math.round((done / total) * 100),
  }
}

/** Tasks that are due or overdue right now, most urgent first. */
export function tasksNeedingAttention(log, now = new Date()) {
  return ALL_TASKS.map((task) => ({
    task,
    state: getTaskState(task, log.completions[task.id] ?? [], now),
  }))
    .filter(({ state }) => isActionable(state.status))
    .sort((a, b) => {
      if (a.state.status !== b.state.status) {
        return a.state.status === STATUS.OVERDUE ? -1 : 1
      }
      return (b.task.points ?? 0) - (a.task.points ?? 0)
    })
}

/** Longest run of consecutive logged days ever — a number that only goes up. */
export function bestStreak(log) {
  const days = [...new Set(allCompletions(log).map((t) => startOfDay(new Date(t)).getTime()))].sort(
    (a, b) => a - b,
  )
  if (!days.length) return 0
  let best = 1
  let run = 1
  for (let i = 1; i < days.length; i += 1) {
    if (daysBetween(days[i - 1], days[i]) === 1) run += 1
    else run = 1
    if (run > best) best = run
  }
  return best
}
