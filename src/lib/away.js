// Being away.
//
// The app is otherwise honest about time passing, which is right — except when
// nobody is home. A long weekend shouldn't cost you a streak or hand you a wall
// of overdue on the doormat, so a window of days can be marked away and the
// scheduling logic reads it.
//
// Away is a property of the household, not of a person: it means the house is
// empty and isn't making mess. If one person travels while the other stays, the
// chores still need doing and nothing here should be switched on.
//
// Windows are kept as a list rather than one slot, because the streak has to
// span trips taken months ago — a single slot forgets the older one and the
// streak breaks at that gap instead.

import { MS_PER_DAY, addDays, startOfDay } from './date.js'

const STORAGE_KEY = 'home-maintenance-dashboard/away/v1'

export const emptyAway = { windows: [] }

/** Enough for years of travel, few enough that the settings doc stays small. */
const MAX_WINDOWS = 24

/** The day after you get back is a to-do list, not a reckoning. */
export const GRACE_DAYS = 1

const dayOf = (value) => startOfDay(new Date(value)).getTime()

export function loadAway() {
  if (typeof window === 'undefined') return emptyAway
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyAway
    return normalizeAway(JSON.parse(raw))
  } catch {
    return emptyAway
  }
}

export function normalizeAway(data) {
  if (!data || typeof data !== 'object') return emptyAway
  const windows = (Array.isArray(data.windows) ? data.windows : [])
    .filter((w) => w && Number.isFinite(w.from) && Number.isFinite(w.to))
    // A window stored the wrong way round is still a window; put it right
    // rather than dropping somebody's trip.
    .map((w) => ({ from: dayOf(Math.min(w.from, w.to)), to: dayOf(Math.max(w.from, w.to)) }))
    .sort((a, b) => b.from - a.from)
    .slice(0, MAX_WINDOWS)
  return { windows }
}

export function saveAway(away) {
  if (typeof window === 'undefined') return
  try {
    if (!away?.windows?.length) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(away))
  } catch {
    // Private browsing — being away just won't persist.
  }
}

// --- reading ----------------------------------------------------------------

/** The window covering a given day, or null. Both ends are inclusive. */
export function windowOn(away, when) {
  const day = dayOf(when)
  return (away?.windows ?? []).find((w) => day >= w.from && day <= w.to) ?? null
}

export function isAway(away, now = new Date()) {
  return windowOn(away, now) !== null
}

/**
 * True for the day or two after a trip ends. Callers use this to soften overdue
 * into due — the tasks are real, the scolding isn't.
 */
export function inGrace(away, now = new Date(), graceDays = GRACE_DAYS) {
  const day = dayOf(now)
  return (away?.windows ?? []).some((w) => day > w.to && day <= w.to + graceDays * MS_PER_DAY)
}

/** "Away until Saturday" / "Away until Aug 30" for the banner and task rows. */
export function awayUntilLabel(away, now = new Date()) {
  const current = windowOn(away, now)
  if (!current) return null
  const end = new Date(current.to)
  const daysLeft = Math.round((current.to - dayOf(now)) / MS_PER_DAY)
  if (daysLeft === 0) return 'Away until today'
  if (daysLeft < 7) return `Away until ${end.toLocaleDateString([], { weekday: 'long' })}`
  return `Away until ${end.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
}

// --- writing ----------------------------------------------------------------

export function addWindow(away, from, to) {
  const start = dayOf(Math.min(from, to))
  const end = dayOf(Math.max(from, to))
  const windows = [{ from: start, to: end }, ...(away?.windows ?? []).filter((w) => w.from !== start)]
  return normalizeAway({ windows })
}

/** Home early. Ends today's window today rather than deleting it — you really
    were away for the days you were away, and the streak still needs to know. */
export function endWindowNow(away, now = new Date()) {
  const current = windowOn(away, now)
  if (!current) return away
  const today = dayOf(now)
  // Ending on the day it started means the trip never happened; drop it.
  if (current.from >= today) return removeWindow(away, current.from)
  return normalizeAway({
    windows: (away?.windows ?? []).map((w) =>
      w.from === current.from ? { ...w, to: addDays(new Date(today), -1).getTime() } : w,
    ),
  })
}

export function removeWindow(away, from) {
  return normalizeAway({ windows: (away?.windows ?? []).filter((w) => w.from !== from) })
}

/** Trips that haven't happened yet, newest first — shown under the date form. */
export function upcomingWindows(away, now = new Date()) {
  const today = dayOf(now)
  return (away?.windows ?? []).filter((w) => w.to >= today)
}
