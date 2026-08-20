// Typing a whole house in at once.
//
// Adding thirty chores through the form is thirty rounds of tap-type-pick-save.
// This takes a list somebody typed in Notes and turns it into the same
// structures the form produces — no new shapes, no second way for a task to
// exist.
//
//   Kitchen: Wipe counters, weekly, 3
//   Chickens: Collect eggs, daily, 2
//   Refill waterer, every 3 days
//
// The room carries down the list until another one is named, because that's how
// people actually write a list. Schedule and points are optional and either
// order — a bare number is points, anything else is read as a schedule.
//
// **Nothing here can move an id.** A task that already exists is updated through
// `taskSettings`, exactly as editing it by hand would, so its history stays
// attached. A room that already exists is matched by its display name rather
// than created a second time.

import { DAY_NAMES } from './date.js'
import { MAX_POINTS, MIN_POINTS, addArea, addTask, updateTaskSettings } from './custom.js'

/** Everything the app can build from a form, in the words it prints them in. */
const WORDS = [
  [/^every ?day$|^daily$|^each ?day$/, () => ({ kind: 'daily' })],
  [/^weekly$|^once a week$|^1x ?(?:per|a) ?week$/, () => ({ kind: 'weekly' })],
  [/^weekends?$|^saturday or sunday$/, () => ({ kind: 'weekend' })],
  [/^(\d+)x ?(?:per|a) ?week$|^(\d+) ?times ?(?:per|a) ?week$/, (m) => ({ kind: 'timesPerWeek', times: clamp(Number(m[1] ?? m[2]), 2, 7) })],
  [/^every ?(\d+) ?days?$/, (m) => ({ kind: 'everyNDays', days: clamp(Number(m[1]), 1, 365) })],
  [/^every ?(\d+) ?weeks?$/, (m) => ({ kind: 'everyNDays', days: clamp(Number(m[1]) * 7, 1, 365) })],
  [/^fortnightly$|^every other week$/, () => ({ kind: 'everyNDays', days: 14 })],
  [/^every ?(\d+) ?months?$/, (m) => ({ kind: 'everyNMonths', months: clamp(Number(m[1]), 1, 60) })],
  [/^monthly$/, () => ({ kind: 'everyNMonths', months: 1 })],
  [/^quarterly$/, () => ({ kind: 'everyNMonths', months: 3 })],
  [/^yearly$|^annually$/, () => ({ kind: 'everyNMonths', months: 12 })],
]

const clamp = (n, low, high) => Math.min(high, Math.max(low, Math.round(n)))

const dayIndex = (word) =>
  DAY_NAMES.findIndex((name) => name.toLowerCase().startsWith(word.slice(0, 3).toLowerCase()))

/**
 * A schedule from a handful of words, or null.
 *
 * Deliberately accepts what `scheduleLabel()` prints, so a list copied back out
 * of the app goes straight back in.
 */
export function parseSchedule(input) {
  const text = String(input ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!text) return null

  for (const [pattern, build] of WORDS) {
    const match = pattern.exec(text)
    if (match) return build(match)
  }

  // "Mon · Wed · Fri", "mon, wed, fri", "tuesdays"
  const parts = text.split(/[·,/&]| and /).map((part) => part.trim()).filter(Boolean)
  const days = parts.map((part) => dayIndex(part.replace(/s$/, '')))
  if (days.length && days.every((day) => day >= 0)) {
    const unique = [...new Set(days)].sort((a, b) => a - b)
    if (unique.length === 1) return { kind: 'weeklyOn', day: unique[0] }
    return { kind: 'weekdays', days: unique }
  }

  // "every friday"
  const named = /^every ([a-z]+)$/.exec(text)
  if (named) {
    const day = dayIndex(named[1].replace(/s$/, ''))
    if (day >= 0) return { kind: 'weeklyOn', day }
  }

  return null
}

/**
 * Read a pasted list.
 *
 * Returns what *would* happen — nothing is committed here. The sheet shows this
 * back before anything is written, because a bulk edit you can't see first is
 * how somebody ends up with forty duplicated chores.
 */
export function parseImport(text, areas = [], nameFor = (area) => area.name) {
  const byName = new Map()
  for (const area of areas) {
    byName.set(String(nameFor(area)).trim().toLowerCase(), area)
  }
  const existingTasks = new Map()
  for (const area of areas) {
    for (const task of area.tasks ?? []) {
      existingTasks.set(`${area.id}|${String(nameFor(task)).trim().toLowerCase()}`, task)
    }
  }

  const rooms = []
  const tasks = []
  const skipped = []
  const seen = new Set()
  const newRooms = new Set()
  let room = null

  const lines = String(text ?? '').split(/\r?\n/)

  lines.forEach((raw, index) => {
    const line = raw.trim()
    const at = index + 1
    if (!line || line.startsWith('#')) return

    let rest = line
    const roomSplit = /^([^:]{1,60}):(.*)$/.exec(line)
    if (roomSplit) {
      const label = roomSplit[1].trim()
      rest = roomSplit[2].trim()
      const known = byName.get(label.toLowerCase())
      room = known ? { id: known.id, name: label, isNew: false } : { id: null, name: label, isNew: true }
      if (room.isNew && !newRooms.has(label.toLowerCase())) {
        newRooms.add(label.toLowerCase())
        rooms.push(label)
      }
      // "Kitchen:" on its own is a heading, not a task.
      if (!rest) return
    }

    if (!room) {
      skipped.push({ line: at, text: line, why: 'No room yet — start a line with "Room: ".' })
      return
    }

    const [namePart, ...extras] = rest.split(',').map((part) => part.trim())
    if (!namePart) {
      skipped.push({ line: at, text: line, why: 'No task name.' })
      return
    }

    let points = null
    let schedule = null
    let confused = null
    for (const extra of extras) {
      if (!extra) continue
      // A bare number is points; everything else has to be a schedule.
      if (/^\d+$/.test(extra)) {
        points = clamp(Number(extra), MIN_POINTS, MAX_POINTS)
        continue
      }
      const parsed = parseSchedule(extra)
      if (parsed) schedule = parsed
      else confused = extra
    }

    if (confused) {
      skipped.push({ line: at, text: line, why: `"${confused}" isn't a schedule or a number.` })
      return
    }

    const key = `${room.id ?? room.name.toLowerCase()}|${namePart.toLowerCase()}`
    if (seen.has(key)) {
      skipped.push({ line: at, text: line, why: 'Already on this list.' })
      return
    }
    seen.add(key)

    const existing = room.id ? existingTasks.get(`${room.id}|${namePart.toLowerCase()}`) : null

    tasks.push({
      line: at,
      room: room.name,
      areaId: room.id,
      name: namePart,
      points,
      schedule,
      // Updating rather than adding is what keeps a history attached to its id.
      existingId: existing?.id ?? null,
    })
  })

  // A room only gets created if something actually lands in it. Otherwise a
  // typo'd line leaves an empty room behind that nobody asked for.
  const wanted = new Set(tasks.filter((task) => !task.areaId).map((task) => task.room.toLowerCase()))

  return {
    rooms: rooms.filter((name) => wanted.has(name.toLowerCase())),
    tasks,
    skipped,
    added: tasks.filter((task) => !task.existingId).length,
    updated: tasks.filter((task) => task.existingId).length,
  }
}

/** A one-line summary of a parsed task, for the preview. */
export function describeParsed(task, scheduleLabel) {
  const bits = []
  if (task.schedule) bits.push(scheduleLabel(task.schedule))
  if (task.points !== null) bits.push(`${task.points} pts`)
  return bits.join(' · ')
}

/**
 * Do it, in one pass.
 *
 * Written as a single pure transform rather than a loop of provider calls
 * because a new room has to exist before its tasks can go into it, and its id
 * isn't known until it does. One `setCustom` also means one settings-clock
 * stamp and one sync, instead of thirty of each.
 */
export function applyImport(custom, parsed, builtInIds = [], defaultSchedule = { kind: 'weekly' }) {
  let next = custom
  const roomIds = new Map()

  // Rooms first, so a task on the same line as a new room has somewhere to go.
  for (const name of parsed.rooms) {
    const before = next.areas.map((area) => area.id)
    next = addArea(next, { name }, builtInIds)
    const created = next.areas.find((area) => !before.includes(area.id))
    if (created) roomIds.set(name.toLowerCase(), created.id)
  }

  for (const task of parsed.tasks) {
    const areaId = task.areaId ?? roomIds.get(task.room.toLowerCase())
    if (!areaId) continue

    if (task.existingId) {
      // Editing an existing task goes through the same override path as doing
      // it by hand, so the id — and its history — never moves.
      const patch = {}
      if (task.points !== null) patch.points = task.points
      if (task.schedule) patch.schedule = task.schedule
      if (Object.keys(patch).length) next = updateTaskSettings(next, task.existingId, patch)
      continue
    }

    next = addTask(
      next,
      areaId,
      {
        name: task.name,
        schedule: task.schedule ?? defaultSchedule,
        ...(task.points === null ? {} : { points: task.points }),
      },
      builtInIds,
    )
  }

  return next
}
