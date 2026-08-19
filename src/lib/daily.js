// The things the app doesn't know about.
//
// "Call the vet", "pick up feed" — a scratch list for today, sitting above the
// chores on the Today screen. Two rules hold it in place:
//
// 1. **It earns nothing.** Nothing here ever touches log.completions, so it
//    cannot move points, the streak, or the credit balance. Credits are derived
//    by summing task.points over completions (src/lib/credits.js); an item with
//    no task and no points has no business in that sum, and adding it would
//    mean a second, unsyncable source of credits.
// 2. **Nothing here is ever late.** An item has no schedule, so it has no due
//    date. The timestamp exists to prune old ticked items and for nothing else
//    — no age is shown anywhere and no wording calls an item overdue.
//
// It is also deliberately NOT in the sync document. Settings are last-write-wins,
// and a scratch list is the worst possible shape for that: the note on purchases
// in CLAUDE.md concedes that two devices writing within a few seconds can cost
// one of them a write, and losing a purchase is a refunded credit whereas losing
// today's list is the whole feature. It travels in backups, and stays put
// otherwise. If this ever needs to be shared, model it the way completions are.

import { startOfDay } from './date.js'

const STORAGE_KEY = 'home-maintenance-dashboard/today/v1'

export const emptyDaily = { items: [] }

const MAX_ITEMS = 40
export const MAX_TEXT = 120

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeDaily(data) {
  if (!data || typeof data !== 'object') return emptyDaily
  const seen = new Set()
  const items = (Array.isArray(data.items) ? data.items : [])
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const text = typeof item.text === 'string' ? item.text.trim().slice(0, MAX_TEXT) : ''
      if (!text) return null
      const id = typeof item.id === 'string' && item.id ? item.id : newId()
      if (seen.has(id)) return null
      seen.add(id)
      return {
        id,
        text,
        at: Number.isFinite(item.at) ? item.at : Date.now(),
        doneAt: Number.isFinite(item.doneAt) && item.doneAt > 0 ? item.doneAt : 0,
      }
    })
    .filter(Boolean)
    .slice(0, MAX_ITEMS)
  return { items }
}

export function loadDaily() {
  if (typeof window === 'undefined') return emptyDaily
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyDaily
    return normalizeDaily(JSON.parse(raw))
  } catch {
    return emptyDaily
  }
}

export function saveDaily(daily) {
  if (typeof window === 'undefined') return
  try {
    if (!daily?.items?.length) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(daily))
  } catch {
    // Private browsing — the list lasts the session.
  }
}

// --- writing ----------------------------------------------------------------

export function addItem(daily, text, now = Date.now()) {
  const clean = String(text ?? '').trim().slice(0, MAX_TEXT)
  if (!clean) return normalizeDaily(daily)
  const items = [...(daily?.items ?? []), { id: newId(), text: clean, at: now, doneAt: 0 }]
  // Oldest goes when the list is full, which is the one you stopped caring about.
  return normalizeDaily({ items: items.slice(-MAX_ITEMS) })
}

/** Tick or untick. Ticking is not a completion — see the note at the top. */
export function toggleItem(daily, id, now = Date.now()) {
  return normalizeDaily({
    items: (daily?.items ?? []).map((item) =>
      item.id === id ? { ...item, doneAt: item.doneAt ? 0 : now } : item,
    ),
  })
}

export function removeItem(daily, id) {
  return normalizeDaily({ items: (daily?.items ?? []).filter((item) => item.id !== id) })
}

/**
 * Drop items ticked on an earlier day. Untouched items stay as long as you like
 * — it's a list, not a schedule, and nothing about waiting is a failure.
 */
export function pruneDaily(daily, now = new Date()) {
  const today = startOfDay(now).getTime()
  const items = (daily?.items ?? []).filter((item) => !item.doneAt || item.doneAt >= today)
  if (items.length === (daily?.items ?? []).length) return normalizeDaily(daily)
  return normalizeDaily({ items })
}

/** Undone first, in the order they were written. */
export function openItems(daily) {
  return (daily?.items ?? []).filter((item) => !item.doneAt)
}

export function doneItems(daily) {
  return (daily?.items ?? []).filter((item) => item.doneAt)
}
