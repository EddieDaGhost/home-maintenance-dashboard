// Streaks, points, progress and history. All of it is encouragement, none of it
// is a punishment: nothing here can go negative and nothing scolds you.
//
// These take the task list as an argument rather than importing it, because the
// rooms are no longer fixed — you can add and remove them from inside the app.

import { MS_PER_DAY, daysBetween, startOfDay, startOfWeek } from './date.js'
import { STATUS, getTaskState, isActionable } from './schedule.js'
import { timeOf } from './storage.js'

/** Every completion across every task, newest first, tagged with its task. */
export function allEntries(log, tasks = null) {
  const wanted = tasks ? new Set(tasks.map((t) => t.id)) : null
  const out = []
  for (const [taskId, entries] of Object.entries(log.completions ?? {})) {
    if (wanted && !wanted.has(taskId)) continue
    for (const entry of entries) out.push({ taskId, at: timeOf(entry), by: entry?.by })
  }
  return out.sort((a, b) => b.at - a.at)
}

function activeDays(log, tasks) {
  return new Set(allEntries(log, tasks).map((e) => startOfDay(new Date(e.at)).getTime()))
}

/**
 * Consecutive days ending today (or yesterday, so an evening person doesn't
 * lose the streak at midnight) where at least one task was logged.
 */
export function currentStreak(log, now = new Date(), tasks = null) {
  const days = activeDays(log, tasks)
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

/** Longest run of consecutive logged days ever — a number that only goes up. */
export function bestStreak(log, tasks = null) {
  const days = [...activeDays(log, tasks)].sort((a, b) => a - b)
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

/** Points earned since Monday. */
export function weeklyPoints(log, now = new Date(), tasks = [], personId = null) {
  const weekStart = startOfWeek(now).getTime()
  const pointsById = Object.fromEntries(tasks.map((t) => [t.id, t.points ?? 1]))
  let total = 0
  for (const entry of allEntries(log, tasks)) {
    if (entry.at < weekStart) continue
    if (personId && entry.by !== personId) continue
    total += pointsById[entry.taskId] ?? 1
  }
  return total
}

/** Total points available this week, so the progress bar has a ceiling. */
export function weeklyPointsGoal(now = new Date(), tasks = []) {
  let total = 0
  for (const task of tasks) {
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
export function completedToday(log, now = new Date(), tasks = null) {
  const dayStart = startOfDay(now).getTime()
  return allEntries(log, tasks).filter((e) => e.at >= dayStart).length
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
export function tasksNeedingAttention(log, now = new Date(), tasks = []) {
  return tasks
    .map((task) => ({
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

// ===========================================================================
// History
// ===========================================================================

/**
 * A grid for the heatmap: `weeks` Monday-started columns ending with the week
 * containing today, each holding 7 days with a completion count.
 */
export function activityGrid(log, now = new Date(), weeks = 12, tasks = null) {
  const counts = new Map()
  for (const entry of allEntries(log, tasks)) {
    const key = startOfDay(new Date(entry.at)).getTime()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const thisWeek = startOfWeek(now)
  const firstWeek = new Date(thisWeek.getTime() - (weeks - 1) * 7 * MS_PER_DAY)
  const today = startOfDay(now).getTime()

  const columns = []
  for (let w = 0; w < weeks; w += 1) {
    const days = []
    for (let d = 0; d < 7; d += 1) {
      const date = new Date(firstWeek.getTime() + (w * 7 + d) * MS_PER_DAY)
      const key = startOfDay(date).getTime()
      days.push({
        date,
        key,
        count: counts.get(key) ?? 0,
        isFuture: key > today,
        isToday: key === today,
      })
    }
    columns.push({ start: new Date(firstWeek.getTime() + w * 7 * MS_PER_DAY), days })
  }
  return columns
}

/** Recent completions grouped by day, newest first. */
export function historyByDay(log, tasks = null, limit = 60) {
  const groups = []
  let current = null
  for (const entry of allEntries(log, tasks).slice(0, limit)) {
    const key = startOfDay(new Date(entry.at)).getTime()
    if (!current || current.key !== key) {
      current = { key, date: new Date(key), entries: [] }
      groups.push(current)
    }
    current.entries.push(entry)
  }
  return groups
}

/** Totals for the history header. */
export function historyTotals(log, now = new Date(), tasks = null) {
  const entries = allEntries(log, tasks)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  return {
    total: entries.length,
    thisMonth: entries.filter((e) => e.at >= monthStart).length,
    activeDays: activeDays(log, tasks).size,
  }
}

/** Points per person this week, for the household screen. */
export function pointsByPerson(log, people, tasks, now = new Date()) {
  return people.map((person) => ({
    person,
    points: weeklyPoints(log, now, tasks, person.id),
  }))
}
