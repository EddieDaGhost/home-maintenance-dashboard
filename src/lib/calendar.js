// Builds a .ics file you can open on an iPhone to drop the whole routine into
// the Calendar app as repeating all-day events.
//
// On purpose: no VALARM anywhere. These are quiet entries you can glance at,
// not alerts that buzz at you. Logging still happens in the app.

import { AREAS } from '../config/areas.js'
import { addDays, startOfDay, toIcsDate, toIcsTimestamp } from './date.js'
import { icsPreferredDays, nextOccurrence } from './schedule.js'

const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

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

export function buildCalendar(log = { completions: {} }, now = new Date()) {
  const stamp = toIcsTimestamp(now)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Home Maintenance Dashboard//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Home Maintenance',
    'X-WR-TIMEZONE:America/Chicago',
  ]

  for (const area of AREAS) {
    for (const task of area.tasks) {
      const completions = log.completions?.[task.id] ?? []
      const start = startDateFor(task, completions, now)
      const description = task.note
        ? `${task.note} — logged in your Home Maintenance dashboard.`
        : 'Logged in your Home Maintenance dashboard.'

      lines.push(
        'BEGIN:VEVENT',
        `UID:${task.id}@home-maintenance-dashboard`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${toIcsDate(start)}`,
        `DTEND;VALUE=DATE:${toIcsDate(addDays(start, 1))}`,
        `RRULE:${rruleFor(task.schedule)}`,
        `SUMMARY:${escapeText(`${area.name}: ${task.name}`)}`,
        `DESCRIPTION:${escapeText(description)}`,
        `CATEGORIES:${escapeText(area.name)}`,
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
      )
    }
  }

  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n')
}

/** Trigger the browser download. On iPhone this opens straight into Calendar. */
export function downloadCalendar(log, now = new Date()) {
  const ics = buildCalendar(log, now)
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
