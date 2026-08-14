// Small date helpers. Everything works in the browser's local time zone,
// because "did I do this today?" is a local-time question.

export const MS_PER_DAY = 24 * 60 * 60 * 1000

// Monday of the very first week we count from. Used to number weeks so the
// bathroom deep-clean rotation lands on the same bathroom for everyone.
const ANCHOR_MONDAY = new Date(2024, 0, 1) // Mon, Jan 1 2024, local time

export function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Monday-based start of the week containing `date`. */
export function startOfWeek(date = new Date()) {
  const d = startOfDay(date)
  const mondayOffset = (d.getDay() + 6) % 7 // Mon -> 0 ... Sun -> 6
  return addDays(d, -mondayOffset)
}

/** Whole calendar days from `a` to `b` (b later => positive). DST safe. */
export function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / MS_PER_DAY)
}

/** How many weeks since the anchor Monday — used for rotating schedules. */
export function weekIndex(date = new Date()) {
  return Math.round((startOfWeek(date) - ANCHOR_MONDAY) / (7 * MS_PER_DAY))
}

/** Position of a day inside a Monday-first week: Mon -> 0 ... Sun -> 6. */
export function weekPosition(dayOfWeek) {
  return (dayOfWeek + 6) % 7
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** "Just now" / "Today" / "Yesterday" / "3 days ago" / "Aug 2". */
export function friendlyDate(timestamp, now = new Date()) {
  if (!timestamp) return 'Never'
  const then = new Date(timestamp)
  const days = daysBetween(then, now)
  if (days === 0) {
    const minutes = Math.round((now - then) / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} min ago`
    return `Today, ${then.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  }
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'Last week'
  return then.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/** Basic YYYYMMDD, the format iCalendar wants for all-day events. */
export function toIcsDate(date) {
  const d = startOfDay(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

/** UTC timestamp format for DTSTAMP: 20260814T201100Z */
export function toIcsTimestamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}
