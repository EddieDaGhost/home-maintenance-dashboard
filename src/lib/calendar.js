// Builds a .ics file you can open on an iPhone to drop the whole routine into
// the Calendar app as repeating all-day events.
//
// On purpose: no VALARM anywhere. These are quiet entries you can glance at,
// not alerts that buzz at you. Logging still happens in the app.

import { addDays, startOfDay, toIcsDate, toIcsTimestamp } from './date.js'
import { displayName } from './names.js'
import { icsPreferredDays, nextOccurrence } from './schedule.js'

const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

// Remembering what the last export contained is what makes re-exporting safe:
// every event keeps its UID and gets a higher SEQUENCE, so a calendar updates
// the entry it already has instead of adding a second copy. Tasks that have
// since disappeared are re-sent as cancellations so they clear out too.
const EXPORT_KEY = 'home-maintenance-dashboard/export/v1'

export function loadExportState() {
  if (typeof window === 'undefined') return { sequence: 0, taskIds: [] }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(EXPORT_KEY) ?? 'null')
    return {
      sequence: Number.isFinite(parsed?.sequence) ? parsed.sequence : 0,
      taskIds: Array.isArray(parsed?.taskIds) ? parsed.taskIds : [],
    }
  } catch {
    return { sequence: 0, taskIds: [] }
  }
}

export function saveExportState(state) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(EXPORT_KEY, JSON.stringify(state))
  } catch {
    // Not fatal — the next export just starts its sequence over.
  }
}

function escapeText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * iCalendar lines wrap at 75 octets and continuations start with a single
 * space. The limit is bytes, not characters, so an em dash or an emoji in a
 * task name has to be measured as UTF-8 and never split down the middle.
 */
const LINE_LIMIT = 74 // leaves room inside the 75-octet rule
const encoder = new TextEncoder()

function foldLine(line) {
  if (encoder.encode(line).length <= LINE_LIMIT) return line

  const chunks = []
  let current = ''
  let bytes = 0

  for (const char of line) {
    const size = encoder.encode(char).length
    if (bytes + size > LINE_LIMIT) {
      chunks.push(current)
      current = ` ${char}` // the leading space marks a continuation line
      bytes = 1 + size
    } else {
      current += char
      bytes += size
    }
  }
  chunks.push(current)
  return chunks.join('\r\n')
}

function rruleFor(schedule) {
  const byDay = icsPreferredDays(schedule)
    .map((d) => ICS_DAYS[d])
    .join(',')

  switch (schedule.kind) {
    case 'daily':
      return 'FREQ=DAILY'
    case 'everyNDays':
      // A 7/14/21-day rhythm reads better as "every N weeks on Saturday".
      if (schedule.days % 7 === 0 && byDay) {
        return `FREQ=WEEKLY;INTERVAL=${schedule.days / 7};BYDAY=${byDay}`
      }
      return `FREQ=DAILY;INTERVAL=${schedule.days}`
    case 'everyNMonths':
      return `FREQ=MONTHLY;INTERVAL=${schedule.months}`
    case 'rotatingWeek':
      return `FREQ=WEEKLY;INTERVAL=${schedule.cycle};BYDAY=${byDay}`
    default:
      return `FREQ=WEEKLY;BYDAY=${byDay}`
  }
}

/** First date of the series, nudged onto a preferred weekday when there is one. */
function startDateFor(task, completions, now) {
  let start = nextOccurrence(task, completions, now)
  const preferred = task.schedule.calendarDays
  if (preferred?.length) {
    for (let i = 0; i < 7; i += 1) {
      const candidate = addDays(start, i)
      if (preferred.includes(candidate.getDay())) return candidate
    }
  }
  return startOfDay(start)
}

export function buildCalendar(
  log = { completions: {} },
  now = new Date(),
  names = {},
  areas = [],
  previous = { sequence: 0, taskIds: [] },
) {
  const stamp = toIcsTimestamp(now)
  const sequence = (previous.sequence ?? 0) + 1
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Home Maintenance Dashboard//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Home Maintenance',
    'X-WR-TIMEZONE:America/Chicago',
  ]

  for (const area of areas) {
    for (const task of area.tasks) {
      const completions = log.completions?.[task.id] ?? []
      const start = startDateFor(task, completions, now)
      const areaName = displayName(area, names)
      const taskName = displayName(task, names)
      const description = task.note
        ? `${task.note} — logged in your Home Maintenance dashboard.`
        : 'Logged in your Home Maintenance dashboard.'

      lines.push(
        'BEGIN:VEVENT',
        `UID:${task.id}@home-maintenance-dashboard`,
        `DTSTAMP:${stamp}`,
        `SEQUENCE:${sequence}`,
        `DTSTART;VALUE=DATE:${toIcsDate(start)}`,
        `DTEND;VALUE=DATE:${toIcsDate(addDays(start, 1))}`,
        `RRULE:${rruleFor(task.schedule)}`,
        `SUMMARY:${escapeText(`${areaName}: ${taskName}`)}`,
        `DESCRIPTION:${escapeText(description)}`,
        `CATEGORIES:${escapeText(areaName)}`,
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
      )
    }
  }

  // Anything that was in the last export but is gone now gets cancelled, so a
  // room you deleted stops haunting your calendar.
  const currentIds = areas.flatMap((area) => area.tasks.map((task) => task.id))
  const removed = (previous.taskIds ?? []).filter((id) => !currentIds.includes(id))
  const todayDate = startOfDay(now)
  for (const taskId of removed) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${taskId}@home-maintenance-dashboard`,
      `DTSTAMP:${stamp}`,
      `SEQUENCE:${sequence}`,
      'STATUS:CANCELLED',
      `DTSTART;VALUE=DATE:${toIcsDate(todayDate)}`,
      `DTEND;VALUE=DATE:${toIcsDate(addDays(todayDate, 1))}`,
      'SUMMARY:Removed from Home Maintenance',
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return {
    ics: lines.map(foldLine).join('\r\n'),
    state: { sequence, taskIds: currentIds },
    removedCount: removed.length,
  }
}

/** Trigger the browser download. On iPhone this opens straight into Calendar. */
export function downloadCalendar(log, now = new Date(), names = {}, areas = []) {
  const { ics, state } = buildCalendar(log, now, names, areas, loadExportState())
  saveExportState(state)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'home-maintenance.ics'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Give Safari a moment to hand the file off before revoking it.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
