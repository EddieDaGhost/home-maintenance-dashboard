// The note on the dashboard: which one you get, and whether you get one.
//
// The words live in src/config/notes.js, along with the rules about what they
// are allowed to say. This file is only the picking and the preference.
//
// ---------------------------------------------------------------------------
// Why this is not Math.random()
// ---------------------------------------------------------------------------
//
// The dashboard re-renders every sixty seconds — see the clock tick in
// App.jsx, which keeps statuses honest across midnight. A note picked at random
// during render would therefore change itself while you were reading it, about
// once a minute, forever. So the pick is a pure function of the day.
//
// Stepping through the list by a prime rather than hashing gives two things a
// hash does not: consecutive days can never collide, and you see every note in
// the list before any of them comes round again.
//
// ---------------------------------------------------------------------------
// Why the preference does not sync
// ---------------------------------------------------------------------------
//
// It follows the look, which is also a per-device preference and deliberately
// stays out of the settings document. Two reasons, and the second is the real
// one: the settings document is last-write-wins and shared by the household, so
// one person turning notes off would turn them off for everybody — and whether
// you want a cheerful line on your phone is about as personal as a preference
// gets. `emptyHouse()` keeps it for the same reason it keeps the look.

import { daysBetween } from './date.js'
import { notesFor } from '../config/notes.js'

const STORAGE_KEY = 'home-maintenance-dashboard/notes/v1'

/** On unless you say otherwise: a kind word is not something to opt in to. */
export const defaultNotes = { on: true }

/** Any Monday will do; it only has to be the same one every time. */
const ANCHOR = new Date(2024, 0, 1)

/**
 * Larger than any sensible list, and prime, so `gcd(STEP, count) === 1` for
 * every count below it. That is what guarantees the full cycle.
 */
const STEP = 7919

export function normalizeNotes(data) {
  if (!data || typeof data !== 'object') return defaultNotes
  return { on: data.on !== false }
}

export function loadNotes() {
  if (typeof window === 'undefined') return defaultNotes
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultNotes
    return normalizeNotes(JSON.parse(raw))
  } catch {
    return defaultNotes
  }
}

export function saveNotes(prefs) {
  if (typeof window === 'undefined') return
  try {
    // On is the default, so only "off" is worth a key. Same rule as every other
    // store here: somebody who never touches this leaves no trace.
    if (normalizeNotes(prefs).on) window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ on: false }))
  } catch {
    // Private browsing — it just won't persist.
  }
}

/** Whole local days since the anchor. DST-safe, because daysBetween is. */
export function dayNumber(date = new Date()) {
  return daysBetween(ANCHOR, date)
}

/**
 * Which note, for a given day and a given number of taps on it.
 *
 * `shuffle` is how many times the note has been tapped for another one. It
 * moves the same distance a day does, so tapping walks the list exactly like
 * waiting does — and lands somewhere different every time.
 */
export function pickIndex(count, day, shuffle = 0) {
  if (!Number.isFinite(count) || count <= 0) return -1
  const step = (day + shuffle) * STEP
  // Days before the anchor are negative; JS % keeps the sign, so bring it back.
  return ((step % count) + count) % count
}

export function noteFor(themeId, date = new Date(), shuffle = 0) {
  const list = notesFor(themeId)
  const index = pickIndex(list.length, dayNumber(date), shuffle)
  return index < 0 ? '' : list[index]
}
